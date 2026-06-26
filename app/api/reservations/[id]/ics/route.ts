import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import { buildRdvIcs } from '@/lib/ics';
import { getBaseUrlFromRequest } from '@/lib/site-url';

// ─── GET /api/reservations/[id]/ics ──────────────────────────────────────────
// Sert l'événement calendrier (.ics) du rendez-vous. Renvoyé avec le type MIME
// "text/calendar" pour que l'appareil l'ouvre dans son app calendrier par défaut
// (Apple Calendar, Google Agenda Android, Outlook…). Accessible par id (lien non
// devinable), comme le lien de gestion /mes-rdv/[id].
type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    let rdv: any = null;
    try {
      rdv = await Reservation.findById(params.id).lean();
    } catch {
      // id invalide (CastError)
      return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });
    }
    if (!rdv) {
      return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });
    }

    const ics = buildRdvIcs({
      numero:       rdv.numero,
      date:         rdv.date,
      dureeMinutes: rdv.dureeMinutes ?? 30,
      prestations:  rdv.prestations ?? [],
      manageUrl:    `${getBaseUrlFromRequest(req)}/mes-rdv/${rdv._id}`,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8; method=PUBLISH',
        // inline (et non attachment) : permet aux clients webcal:// / Safari
        // d'ouvrir directement l'app calendrier au lieu de télécharger.
        'Content-Disposition': `inline; filename="gold-cut-rdv-${rdv.numero}.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
