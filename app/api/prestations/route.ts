import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prestation from '@/models/Prestation';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/prestations ─────────────────────────────────────────────────────
// Public — retourne toutes les prestations actives
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const categorie = searchParams.get('categorie');

    const filter: Record<string, unknown> = { actif: true };
    if (categorie) filter.categorie = categorie;

    const prestations = await Prestation.find(filter).sort({ categorie: 1, prix: 1 }).lean();
    return NextResponse.json(prestations);
  } catch (err) {
    console.error('[GET /api/prestations]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/prestations ────────────────────────────────────────────────────
// Admin uniquement — crée une prestation
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { categorie, nom, duree, prix } = body;

    if (!categorie || !nom || !duree || prix === undefined) {
      return NextResponse.json(
        { error: 'categorie, nom, duree et prix sont requis.' },
        { status: 400 }
      );
    }

    const prestation = await Prestation.create({ categorie, nom, duree, prix });
    return NextResponse.json(prestation, { status: 201 });
  } catch (err) {
    console.error('[POST /api/prestations]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
