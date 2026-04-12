import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Admin uniquement — liste tous les clients avec leur dernière réservation
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();

    const clients = await User.find({ role: 'client' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Enrichir avec la dernière réservation de chaque client
    const enriched = await Promise.all(
      clients.map(async (client) => {
        const lastRdv = await Reservation.findOne({ userId: client._id })
          .sort({ date: -1 })
          .select('date statut prestations')
          .lean();

        return { ...client, derniereReservation: lastRdv ?? null };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
