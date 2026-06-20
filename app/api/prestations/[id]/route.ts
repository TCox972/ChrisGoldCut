import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prestation from '@/models/Prestation';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

// ─── GET /api/prestations/[id] ────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const prestation = await Prestation.findById(params.id).lean();
    if (!prestation) {
      return NextResponse.json({ error: 'Prestation introuvable.' }, { status: 404 });
    }
    return NextResponse.json(prestation);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// Champs autorisés à être modifiés via PUT (whitelist contre mass assignment)
const PRESTATION_PUT_FIELDS = ['categorie', 'nom', 'duree', 'prix', 'actif'] as const;

// ─── PUT /api/prestations/[id] ────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    for (const k of PRESTATION_PUT_FIELDS) {
      if (k in body) update[k] = body[k];
    }
    const updated = await Prestation.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Prestation introuvable.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/prestations/[id] ─────────────────────────────────────────────
// Soft delete : on met actif = false plutôt que de supprimer
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const updated = await Prestation.findByIdAndUpdate(
      params.id,
      { actif: false },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Prestation introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Prestation désactivée.' });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
