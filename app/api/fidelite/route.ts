import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import { requireAuth } from '@/lib/auth';

// ─── Configuration fidélité ──────────────────────────────────────────────────
// Une réduction de REWARD_EUR est offerte toutes les PALIER prestations validées.
export const PALIER      = 6;
export const REWARD_EUR  = 10;

// ─── GET /api/fidelite ───────────────────────────────────────────────────────
// Retourne le compteur de fidélité d'un client.
// - Client  : ses propres stats (filtre forcé par userId)
// - Staff   : peut préciser ?userId=... ou ?clientEmail=...
//
// Réponse :
// {
//   totalValidees:            number,  // total historique
//   cycleCount:               number,  // 0..PALIER-1 : avancement dans le cycle courant
//   reservationsUntilReward:  number,  // 1..PALIER (nb de RDV restants avant la prochaine prime)
//   palier:                   number,  // constante
//   rewardEur:                number,  // constante
// }
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = { prestationValidee: true };

    if (isStaff) {
      const userId      = searchParams.get('userId');
      const clientEmail = searchParams.get('clientEmail');
      if (userId) {
        filter.userId = userId;
      } else if (clientEmail) {
        const escaped = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.clientEmail = { $regex: `^${escaped}$`, $options: 'i' };
      } else {
        // Staff qui consulte sans préciser → on retombe sur son propre compteur
        filter.userId = user.id;
      }
    } else {
      filter.userId = user.id;
    }

    const totalValidees            = await Reservation.countDocuments(filter);
    const cycleCount               = totalValidees % PALIER;
    const reservationsUntilReward  = PALIER - cycleCount; // cycleCount=0 → 6, cycleCount=5 → 1

    return NextResponse.json({
      totalValidees,
      cycleCount,
      reservationsUntilReward,
      palier:    PALIER,
      rewardEur: REWARD_EUR,
    });
  } catch (err) {
    console.error('[GET /api/fidelite]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
