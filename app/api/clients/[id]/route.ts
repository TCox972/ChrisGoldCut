import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

// ─── GET /api/clients/[id] ────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();

    const client = await User.findById(params.id).select('-password').lean();
    if (!client) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });

    const reservations = await Reservation.find({ userId: params.id })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ ...client, reservations });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/clients/[id] ─────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Client supprimé.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
