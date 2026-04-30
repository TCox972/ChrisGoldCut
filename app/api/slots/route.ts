import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import BlockedSlot from '@/models/BlockedSlot';
import ClosedDay from '@/models/ClosedDay';
import Prestation from '@/models/Prestation';
import User from '@/models/User';
import {
  generateAllSlots,
  getOccupiedSlots,
  isSlotAvailable,
  parseDuree,
} from '@/lib/slots';

// ─── GET /api/slots ──────────────────────────────────────────────────────────
// Params: date=YYYY-MM-DD &
//   (prestationId=xxx | dureeMinutes=NN)
//   [&employeId=xxx]
//   [&excludeRdvId=xxx]   // pour la modification d'une réservation existante
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr        = searchParams.get('date');
  const prestationId   = searchParams.get('prestationId');
  const dureeParam     = searchParams.get('dureeMinutes');
  const employeId      = searchParams.get('employeId');
  const excludeRdvId   = searchParams.get('excludeRdvId');

  if (!dateStr || (!prestationId && !dureeParam)) {
    return NextResponse.json(
      { error: 'Paramètres date et prestationId (ou dureeMinutes) requis.' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

<<<<<<< HEAD
    // Vérifier si c'est un dimanche
    const dayStart = new Date(`${dateStr}T00:00:00`);
    if (dayStart.getDay() === 0) {
      const allSlots = generateAllSlots();
      return NextResponse.json({
        slots: allSlots.map(heure => ({ heure, disponible: false })),
        dureeMinutes: 30,
        closed: true,
        closedMotif: 'Fermé le dimanche',
      });
    }

    // Vérifier si c'est un jour de fermeture
=======
    // Vérifier si c'est un jour de fermeture
    const dayStart = new Date(`${dateStr}T00:00:00`);
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    const dayEnd   = new Date(`${dateStr}T23:59:59`);

    const closedDay = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    if (closedDay) {
      const allSlots = generateAllSlots();
      return NextResponse.json({
        slots: allSlots.map(heure => ({ heure, disponible: false })),
        dureeMinutes: 30,
        closed: true,
        closedMotif: closedDay.motif || 'Fermé',
      });
    }

    // Durée : soit fournie directement, soit calculée depuis la prestation
    let duree: number;
    if (dureeParam) {
      duree = parseInt(dureeParam, 10) || 30;
    } else {
      const prestation = await Prestation.findById(prestationId).lean();
      if (!prestation) {
        return NextResponse.json({ error: 'Prestation introuvable.' }, { status: 404 });
      }
      duree = parseDuree(prestation.duree);
    }

    // Filtrer les créneaux passés
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const allSlots = generateAllSlots();

    if (employeId) {
      // ── Mode employé spécifique ──
      const empFilter: Record<string, unknown> = {
        date:      { $gte: dayStart, $lte: dayEnd },
        statut:    { $ne: 'annule' },
        employeId,
      };
      if (excludeRdvId) empFilter._id = { $ne: excludeRdvId };

      const reservations = await Reservation.find(empFilter)
        .select('date dureeMinutes').lean();

      // Blocages globaux + blocages de cet employé
      const blockedDocs = await BlockedSlot.find({
        date: { $gte: dayStart, $lte: dayEnd },
        $or: [{ employeId: null }, { employeId }],
      }).lean();

      const occupiedSet = getOccupiedSlots(reservations);
      const blockedSet  = new Set<string>();
      for (const doc of blockedDocs) {
        for (const h of doc.heures) blockedSet.add(h);
      }

      const slots = allSlots.map(heure => ({
        heure,
        disponible: isSlotAvailable(heure, duree, occupiedSet, blockedSet)
          && (!isToday || heure > currentTime),
      }));

      return NextResponse.json({ slots, dureeMinutes: duree });
    }

    // ── Mode "pas de préférence" : un créneau est dispo si AU MOINS un employé est libre ──
    const staffMembers = await User.find(
      { role: { $in: ['admin', 'employe'] } },
      { _id: 1 }
    ).lean();

    const allFilter: Record<string, unknown> = {
      date:   { $gte: dayStart, $lte: dayEnd },
      statut: { $ne: 'annule' },
    };
    if (excludeRdvId) allFilter._id = { $ne: excludeRdvId };

    const allReservations = await Reservation.find(allFilter)
      .select('date dureeMinutes employeId').lean();

    const allBlocked = await BlockedSlot.find({
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    const slots = allSlots.map(heure => {
      if (isToday && heure <= currentTime) return { heure, disponible: false };

      // Pour chaque membre du staff, vérifier s'il est disponible
      const available = staffMembers.some(member => {
        const memberId = member._id.toString();

        const memberRdvs = allReservations.filter(
          r => r.employeId?.toString() === memberId
        );
        const occupiedSet = getOccupiedSlots(memberRdvs);

        const blockedSet = new Set<string>();
        for (const doc of allBlocked) {
          if (doc.employeId === null || doc.employeId?.toString() === memberId) {
            for (const h of doc.heures) blockedSet.add(h);
          }
        }

        return isSlotAvailable(heure, duree, occupiedSet, blockedSet);
      });

      return { heure, disponible: available };
    });

    return NextResponse.json({ slots, dureeMinutes: duree });
  } catch (err) {
    console.error('[GET /api/slots]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
