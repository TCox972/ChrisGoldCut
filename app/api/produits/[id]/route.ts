import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const produit = await Produit.findById(params.id).lean();
    if (!produit) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(produit);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const updated = await Produit.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    await Produit.findByIdAndUpdate(params.id, { actif: false });
    return NextResponse.json({ message: 'Produit désactivé.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
