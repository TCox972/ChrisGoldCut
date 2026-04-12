import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// ─── GET /api/staff ──────────────────────────────────────────────────────────
// Public : retourne la liste des coiffeurs (admin + employés) pour le formulaire de réservation
export async function GET() {
  try {
    await connectDB();
    const staff = await User.find(
      { role: { $in: ['admin', 'employe'] } },
      { _id: 1, prenom: 1, nom: 1 }
    ).sort({ prenom: 1 }).lean();

    return NextResponse.json(staff);
  } catch (err) {
    console.error('[GET /api/staff]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
