import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import BlockedSlot from '@/models/BlockedSlot';
import ClosedDay from '@/models/ClosedDay';
import Prestation from '@/models/Prestation';
import User from '@/models/User';
import { generateUniqueNumero } from '@/models/UsedNumero';
import { requireAuth, getSession } from '@/lib/auth';
import { getOccupiedSlots, isSlotAvailable, parseDuree, dateToSlot, generateAllSlots } from '@/lib/slots';

// ─── GET /api/reservations ─────────────────────────────────────────────────────
// Params optionnels : statut, limit, month, employeId
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const statut     = searchParams.get('statut');
    const limit      = parseInt(searchParams.get('limit') ?? '0');
    const month      = searchParams.get('month');
    const employeId  = searchParams.get('employeId');
    const user       = session!.user as any;

    const filter: Record<string, unknown> = {};

    if (user.role === 'employe') {
      // Un employé ne voit que ses réservations
      filter.employeId = user.id;
    } else if (user.role === 'admin') {
      if (employeId) filter.employeId = employeId;
    } else {
      // Client
      filter.userId = user.id;
      // Masquer les RDV de plus de 3 mois (calculés depuis la date du RDV)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filter.date = { $gte: threeMonthsAgo };
    }

    if (statut) filter.statut = statut;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59),
      };
    }

    let query = Reservation.find(filter).sort({ date: -1 });
    if (limit > 0) query = query.limit(limit);

    const reservations = await query.lean();
    return NextResponse.json(reservations);
  } catch (err) {
    console.error('[GET /api/reservations]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/reservations ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    const body    = await req.json();

    const {
      clientNom, clientEmail, clientTel = '', pourQui = 'moi',
      prestations, date, dureeMinutes, achats = [],
      employeId: requestedEmployeId,
    } = body;

    if (!clientNom || !clientEmail || !date || !prestations?.length) {
      return NextResponse.json(
        { error: 'clientNom, clientEmail, date et prestations sont requis.' },
        { status: 400 }
      );
    }

    const rdvDate = new Date(date);
    const slot    = dateToSlot(rdvDate);

    if (!generateAllSlots().includes(slot)) {
      return NextResponse.json(
        { error: 'Créneau horaire invalide. Les réservations se font toutes les demi-heures.' },
        { status: 400 }
      );
    }

    // Vérifier jour de fermeture
    const dateStr  = `${rdvDate.getFullYear()}-${String(rdvDate.getMonth() + 1).padStart(2, '0')}-${String(rdvDate.getDate()).padStart(2, '0')}`;
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd   = new Date(`${dateStr}T23:59:59`);

    const closedDay = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();
    if (closedDay) {
      return NextResponse.json(
        { error: 'Le salon est fermé ce jour-là.' },
        { status: 409 }
      );
    }

    // Calculer la durée si non fournie
    let duree = dureeMinutes ?? 30;
    if (!dureeMinutes && prestations.length > 0) {
      const presta = await Prestation.findOne({ nom: prestations[0] }).lean();
      if (presta) duree = parseDuree(presta.duree);
    }

    // Déterminer l'employé
    let assignedEmployeId: string | null = requestedEmployeId || null;

    if (assignedEmployeId) {
      // Vérifier la disponibilité de l'employé demandé
      const empRdvs = await Reservation.find({
        date:       { $gte: dayStart, $lte: dayEnd },
        statut:     { $ne: 'annule' },
        employeId:  assignedEmployeId,
      }).select('date dureeMinutes').lean();

      const blockedDocs = await BlockedSlot.find({
        date: { $gte: dayStart, $lte: dayEnd },
        $or: [{ employeId: null }, { employeId: assignedEmployeId }],
      }).lean();

      const occupiedSet = getOccupiedSlots(empRdvs);
      const blockedSet  = new Set<string>();
      for (const doc of blockedDocs) {
        for (const h of doc.heures) blockedSet.add(h);
      }

      if (!isSlotAvailable(slot, duree, occupiedSet, blockedSet)) {
        return NextResponse.json(
          { error: 'Ce créneau n\'est plus disponible pour ce coiffeur.' },
          { status: 409 }
        );
      }
    } else {
      // Attribution automatique : chercher un employé disponible
      const staffMembers = await User.find(
        { role: { $in: ['admin', 'employe'] } },
        { _id: 1 }
      ).lean();

      const allRdvs = await Reservation.find({
        date:   { $gte: dayStart, $lte: dayEnd },
        statut: { $ne: 'annule' },
      }).select('date dureeMinutes employeId').lean();

      const allBlocked = await BlockedSlot.find({
        date: { $gte: dayStart, $lte: dayEnd },
      }).lean();

      // Trouver le premier employé avec le moins de RDV ce jour (équilibrage)
      let bestMember: string | null = null;
      let bestCount = Infinity;

      for (const member of staffMembers) {
        const memberId = member._id.toString();
        const memberRdvs = allRdvs.filter(r => r.employeId?.toString() === memberId);

        const occupiedSet = getOccupiedSlots(memberRdvs);
        const blockedSet  = new Set<string>();
        for (const doc of allBlocked) {
          if (doc.employeId === null || doc.employeId?.toString() === memberId) {
            for (const h of doc.heures) blockedSet.add(h);
          }
        }

        if (isSlotAvailable(slot, duree, occupiedSet, blockedSet)) {
          if (memberRdvs.length < bestCount) {
            bestCount = memberRdvs.length;
            bestMember = memberId;
          }
        }
      }

      if (!bestMember) {
        return NextResponse.json(
          { error: 'Ce créneau n\'est plus disponible.' },
          { status: 409 }
        );
      }

      assignedEmployeId = bestMember;
    }

    // Génération d'un numéro unique 6 caractères (réservé dans UsedNumero)
    const numero = await generateUniqueNumero('reservation');

    const reservation = await Reservation.create({
      numero,
      userId:       session?.user ? (session.user as any).id : null,
      employeId:    assignedEmployeId,
      clientNom,
      clientEmail,
      clientTel,
      pourQui,
      prestations,
      dureeMinutes: duree,
      date:         rdvDate,
      achats,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reservations]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
