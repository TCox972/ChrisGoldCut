import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import User from '@/models/User';
import Prestation from '@/models/Prestation';
import { requireAuth } from '@/lib/auth';
import {
  FIDELITE_PALIER as PALIER,
  FIDELITE_REWARD_PERCENT as REWARD_PERCENT,
  estEligibleFidelite,
} from '@/lib/fidelite';

function buildEntry(label: string, count: number) {
  return {
    label,
    totalValidees: count,
    cycleCount: count % PALIER,
    reservationsUntilReward: PALIER - (count % PALIER),
    palier: PALIER,
    rewardPercent: REWARD_PERCENT,
  };
}

// ─── GET /api/fidelite ───────────────────────────────────────────────────────
// Fidélité globale par compte : une seule carte, tous rendez-vous validés
// confondus.
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = { prestationValidee: true };
    let targetUserId: string | null = null;

    if (isStaff) {
      const userId      = searchParams.get('userId');
      const clientEmail = searchParams.get('clientEmail');
      if (userId) {
        filter.userId = userId;
        targetUserId = userId;
      } else if (clientEmail) {
        const escaped = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.clientEmail = { $regex: `^${escaped}$`, $options: 'i' };
        // Trouver le userId correspondant pour récupérer le profil
        const found = await User.findOne({ email: clientEmail.toLowerCase() }).select('_id').lean();
        if (found) targetUserId = found._id.toString();
      } else {
        filter.userId = user.id;
        targetUserId = user.id;
      }
    } else {
      filter.userId = user.id;
      targetUserId = user.id;
    }

    // Réservations validées, puis on ne garde que celles éligibles à la
    // fidélité (CA prestations ≥ 25 €).
    const validated = await Reservation.find(filter).select('prestations').lean();
    const prestaDocs = await Prestation.find().select('nom prix').lean();
    const priceByNom = new Map(prestaDocs.map(p => [p.nom, p.prix]));
    const count = validated.filter(r => estEligibleFidelite(r.prestations, priceByNom)).length;

    // Prénom du client pour l'intitulé de la carte
    let userPrenom = '';
    if (targetUserId) {
      const userDoc = await User.findById(targetUserId).select('prenom').lean();
      if (userDoc) userPrenom = userDoc.prenom || '';
    }

    const entry = buildEntry(userPrenom ? `Fidélité (${userPrenom})` : 'Fidélité', count);

    return NextResponse.json({ personnes: [entry] });
  } catch (err) {
    console.error('[GET /api/fidelite]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
