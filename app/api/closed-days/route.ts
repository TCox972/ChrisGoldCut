import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ClosedDay from '@/models/ClosedDay';
import Reservation from '@/models/Reservation';
import { requireAdmin } from '@/lib/auth';
import { notifyCancellation } from '@/lib/notifications';
import { dayStartUTC, dayEndUTC } from '@/lib/dates';

// ─── GET /api/closed-days?month=2026-04 ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      // Bornes UTC alignées avec le stockage UTC (dayStartUTC)
      filter.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
        $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
      };
    }

    const days = await ClosedDay.find(filter).sort({ date: 1 }).lean();
    return NextResponse.json(days);
  } catch (err) {
    console.error('[GET /api/closed-days]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/closed-days ──────────────────────────────────────────────────
// Body: { date: "2026-04-10", motif: "Jour férié" }
// Fermer un jour : annule tous les RDV à venir et notifie les clients
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { date: dateStr, motif } = await req.json();

    if (!dateStr) {
      return NextResponse.json({ error: 'Date requise.' }, { status: 400 });
    }
    if (!motif?.trim()) {
      return NextResponse.json({ error: 'Motif requis.' }, { status: 400 });
    }

    const dayStart = dayStartUTC(dateStr);
    const dayEnd   = dayEndUTC(dateStr);

    // Garde : on refuse de fermer un jour déjà passé. Une fermeture rétroactive
    // annulerait des RDV déjà honorés et fausserait les statistiques.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (dayEnd < todayStart) {
      return NextResponse.json(
        { error: 'Impossible de fermer un jour déjà passé.' },
        { status: 400 },
      );
    }

    // Vérifier si déjà fermé
    const existing = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ce jour est déjà fermé.' }, { status: 409 });
    }

    // Créer le jour de fermeture
    const doc = await ClosedDay.create({ date: dayStart, motif: motif.trim() });

    // Annuler tous les RDV à venir ce jour-là
    const rdvs = await Reservation.find({
      date: { $gte: dayStart, $lte: dayEnd },
      statut: 'a-venir',
    }).lean();

    if (rdvs.length > 0) {
      await Reservation.updateMany(
        { _id: { $in: rdvs.map(r => r._id) } },
        { $set: { statut: 'annule', motifAnnulation: `Fermeture du salon : ${motif.trim()}` } },
      );

      // Envoyer un mail d'annulation à chaque client
      for (const rdv of rdvs) {
        notifyCancellation(
          {
            numero: rdv.numero,
            _id: String(rdv._id),
            clientNom: rdv.clientNom,
            clientEmail: rdv.clientEmail,
            clientTel: rdv.clientTel,
            prestations: rdv.prestations,
            date: rdv.date,
            pourQui: rdv.pourQui,
          },
          `Fermeture du salon : ${motif.trim()}`,
        ).catch(err => console.error('[closed-day cancel notify]', err));
      }
    }

    return NextResponse.json({ ...doc.toObject(), cancelledCount: rdvs.length }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/closed-days]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/closed-days ────────────────────────────────────────────────
// Body: { date: "2026-04-10" }
// Réouvrir un jour fermé
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { date: dateStr } = await req.json();

    if (!dateStr) {
      return NextResponse.json({ error: 'Date requise.' }, { status: 400 });
    }

    const dayStart = dayStartUTC(dateStr);
    const dayEnd   = dayEndUTC(dateStr);

    const existing = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Jour non trouvé.' }, { status: 404 });
    }

    await ClosedDay.findByIdAndDelete(existing._id);
    return NextResponse.json({ removed: true });
  } catch (err) {
    console.error('[DELETE /api/closed-days]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
