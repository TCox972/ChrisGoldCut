import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/produits ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const categorie = searchParams.get('categorie');
    const includeInactif = searchParams.get('all') === 'true';

    const filter: Record<string, unknown> = {};
    if (!includeInactif) filter.actif = true;
    if (categorie && categorie !== 'Tout') filter.categorie = categorie;

    const produits = await Produit.find(filter).sort({ categorie: 1, nom: 1 }).lean();
    return NextResponse.json(produits);
  } catch (err) {
    console.error('[GET /api/produits]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/produits ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { categorie, nom, description, prix, image, stock } = body;

    if (!categorie || !nom || prix === undefined) {
      return NextResponse.json(
        { error: 'categorie, nom et prix sont requis.' },
        { status: 400 }
      );
    }

    const produit = await Produit.create({ categorie, nom, description, prix, image, stock });
    return NextResponse.json(produit, { status: 201 });
  } catch (err) {
    console.error('[POST /api/produits]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
