import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';
import { requireAdmin, getSession } from '@/lib/auth';

// ─── GET /api/produits ────────────────────────────────────────────────────────
// Public — par défaut retourne uniquement les produits actifs.
// Admin (avec ?all=true) — retourne tout, y compris les produits désactivés.
//   Le flag est ignoré silencieusement pour les non-admins (on ne veut pas
//   exposer la liste des produits désactivés au public).
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const categorie = searchParams.get('categorie');
    const includeInactifRequested = searchParams.get('all') === 'true';

    let includeInactif = false;
    if (includeInactifRequested) {
      const session = await getSession();
      if ((session?.user as any)?.role === 'admin') {
        includeInactif = true;
      }
    }

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
    const { categorie, nom, description, prix, image } = body;

    if (!categorie || !nom || prix === undefined) {
      return NextResponse.json(
        { error: 'categorie, nom et prix sont requis.' },
        { status: 400 }
      );
    }

    const produit = await Produit.create({ categorie, nom, description, prix, image });
    return NextResponse.json(produit, { status: 201 });
  } catch (err) {
    console.error('[POST /api/produits]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
