import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const produit = await Produit.findOne({ _id: params.id, actif: true }).lean();
    if (!produit) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(produit);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// Champs autorisés à être modifiés via PUT (whitelist contre mass assignment)
const PRODUIT_PUT_FIELDS = [
  'categorie', 'nom', 'description', 'descriptionLongue',
  'prix', 'image', 'images', 'actif',
] as const;

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    for (const k of PRODUIT_PUT_FIELDS) {
      if (k in body) update[k] = body[k];
    }
    const updated = await Produit.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// DELETE /api/produits/[id]
//   • par défaut : suppression douce (actif = false) → réactivable
//   • avec ?hard=true : suppression définitive en base (irréversible)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const hard = new URL(req.url).searchParams.get('hard') === 'true';

    if (hard) {
      const deleted = await Produit.findByIdAndDelete(params.id);
      if (!deleted) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
      return NextResponse.json({ message: 'Produit supprimé définitivement.' });
    }

    await Produit.findByIdAndUpdate(params.id, { actif: false });
    return NextResponse.json({ message: 'Produit désactivé.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
