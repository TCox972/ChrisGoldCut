import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import { notifyReminder24h } from '@/lib/notifications';

// ─── GET /api/cron/reminders ────────────────────────────────────────────────
// Envoie les rappels email + SMS pour les RDV prévus dans ~24h.
// Doit être appelé toutes les heures par un cron (Vercel Cron, etc.)
// Protection : vérifier le header Authorization avec CRON_SECRET.
export async function GET(req: NextRequest) {
  // Sécurisation : seul un appel avec le bon secret peut déclencher.
  // Fail-closed : si CRON_SECRET n'est pas configuré, on refuse TOUT appel
  // (plutôt que d'ouvrir la route à n'importe qui).
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    await connectDB();

    // Fenêtre : RDV entre maintenant +23h et +25h (pour tolérer le décalage du cron)
    const now = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const rdvs = await Reservation.find({
      date:             { $gte: from, $lte: to },
      statut:           'a-venir',
      reminderSent:     { $ne: true },
    }).lean();

    let sent = 0;
    for (const rdv of rdvs) {
      await notifyReminder24h({
        numero: rdv.numero,
        _id: rdv._id.toString(),
        clientNom: rdv.clientNom,
        clientEmail: rdv.clientEmail,
        clientTel: rdv.clientTel,
        prestations: rdv.prestations,
        date: rdv.date,
        pourQui: rdv.pourQui,
      });

      // Marquer comme envoyé pour ne pas renvoyer
      await Reservation.collection.updateOne(
        { _id: rdv._id },
        { $set: { reminderSent: true } },
      );
      sent++;
    }

    return NextResponse.json({ sent, total: rdvs.length });
  } catch (err) {
    console.error('[GET /api/cron/reminders]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
