import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/gallery ────────────────────────────────────────────────────────
// Public — retourne la liste des photos triées par ordre asc.
export async function GET() {
  try {
    await connectDB();
    const items = await Gallery.find().sort({ ordre: 1, createdAt: 1 }).lean();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/gallery]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/gallery ───────────────────────────────────────────────────────
// Admin — ajoute une nouvelle photo. Body: { url, publicId }
// Le `ordre` est calculé automatiquement (max(ordre) + 1).
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { url, publicId } = await req.json();

    if (!url || !publicId) {
      return NextResponse.json(
        { error: 'url et publicId sont requis.' },
        { status: 400 },
      );
    }

    const last = await Gallery.findOne().sort({ ordre: -1 }).select('ordre').lean();
    const nextOrdre = (last?.ordre ?? -1) + 1;

    const created = await Gallery.create({ url, publicId, ordre: nextOrdre });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[POST /api/gallery]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/gallery ──────────────────────────────────────────────────────
// Admin — réordonne la galerie. Body: { ids: string[] }
// L'ordre est attribué selon la position dans le tableau.
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { ids } = await req.json();

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'ids (string[]) requis.' }, { status: 400 });
    }

    // Mise à jour groupée : bulkWrite pour un seul aller-retour MongoDB
    const ops = ids.map((id, i) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { ordre: i } },
      },
    }));
    if (ops.length > 0) await Gallery.bulkWrite(ops);

    return NextResponse.json({ message: 'Ordre mis à jour.' });
  } catch (err) {
    console.error('[PATCH /api/gallery]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
