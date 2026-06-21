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
import { dayStartUTC, dayEndUTC, toDateStrUTC } from '@/lib/dates';
import { notifyBookingConfirmation } from '@/lib/notifications';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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
    const viewClient = searchParams.get('view') === 'client';

    if (viewClient) {
      // Vue client : l'utilisateur veut voir ses propres RDV (même s'il est coiffeur)
      filter.userId = user.id;
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filter.date = { $gte: threeMonthsAgo };
    } else if (user.role === 'employe') {
      // Vue employé (admin) : RDV assignés à ce coiffeur
      filter.employeId = user.id;
    } else if (user.role === 'admin') {
      if (employeId) filter.employeId = employeId;
    } else {
      // Client classique
      filter.userId = user.id;
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filter.date = { $gte: threeMonthsAgo };
    }

    if (statut) filter.statut = statut;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      // Bornes UTC alignées avec le stockage UTC des dates de RDV
      filter.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
        $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
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
  const rl = rateLimit({ key: `reservation:${getClientIp(req)}`, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de réservations en peu de temps. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

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

    // Vérifier si le client est blacklisté + identifier le compte associé
    // pour rattacher automatiquement la réservation s'il existe déjà sous cet
    // email (cas d'un client qui réserve en invité mais a un compte non connecté).
    const clientUser = await User.findOne({ email: clientEmail.toLowerCase() })
      .select('_id blackliste')
      .lean();
    if (clientUser?.blackliste) {
      return NextResponse.json(
        { error: 'blackliste' },
        { status: 403 },
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

    // Vérifier jour de fermeture (bornes en UTC pour rester TZ-indépendant)
    const dateStr  = toDateStrUTC(rdvDate);
    const dayStart = dayStartUTC(dateStr);
    const dayEnd   = dayEndUTC(dateStr);

    const closedDay = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();
    if (closedDay) {
      return NextResponse.json(
        { error: 'Le salon est fermé ce jour-là.' },
        { status: 409 }
      );
    }

    // Vérifier que TOUTES les prestations soumises existent ET sont actives.
    // (Le client charge la liste au montage : si l'admin désactive une
    // prestation pendant que le client remplit le formulaire, le client peut
    // soumettre une prestation qui n'est plus proposée → on refuse ici.)
    const activePrestations = await Prestation.find({
      nom: { $in: prestations },
      actif: true,
    }).lean();
    const activeNames = new Set(activePrestations.map(p => p.nom));
    const unavailable = prestations.filter((nom: string) => !activeNames.has(nom));
    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: unavailable.length === 1
            ? `La prestation « ${unavailable[0]} » n'est plus disponible.`
            : `Ces prestations ne sont plus disponibles : ${unavailable.join(', ')}.`,
        },
        { status: 409 },
      );
    }

    // Calculer la durée si non fournie : somme de TOUTES les prestations
    let duree = dureeMinutes ?? 0;
    if (!dureeMinutes && prestations.length > 0) {
      const dureeMap = new Map(activePrestations.map(p => [p.nom, parseDuree(p.duree)]));
      duree = prestations.reduce(
        (sum: number, nom: string) => sum + (dureeMap.get(nom) ?? 30),
        0,
      );
    }
    if (!duree || duree < 30) duree = 30;

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

    // userId : session > compte existant matché par email > null (invité pur)
    const resolvedUserId = session?.user
      ? (session.user as any).id
      : (clientUser?._id ?? null);

    let reservation;
    try {
      reservation = await Reservation.create({
        numero,
        userId:       resolvedUserId,
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
    } catch (e: any) {
      // E11000 : conflit unique sur (employeId, date, statut: a-venir).
      // Une autre réservation a été créée juste avant — race condition gérée
      // proprement plutôt que de laisser passer un double-booking.
      if (e?.code === 11000) {
        return NextResponse.json(
          { error: 'Ce créneau vient d\'être réservé par un autre client. Veuillez choisir un autre horaire.' },
          { status: 409 },
        );
      }
      throw e;
    }

    // Envoi de l'email de confirmation (non bloquant)
    notifyBookingConfirmation({
      numero: reservation.numero,
      _id: reservation._id.toString(),
      clientNom,
      clientEmail,
      clientTel,
      prestations,
      date: rdvDate,
      pourQui,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reservations]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
