import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CategoryOrder from '@/models/CategoryOrder';
import Prestation from '@/models/Prestation';
import Produit from '@/models/Produit';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/category-order?type=prestations|produits ───────────────────────
// Public — retourne l'ordre des catégories
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const type = req.nextUrl.searchParams.get('type');
    if (type !== 'prestations' && type !== 'produits') {
      return NextResponse.json({ error: 'type must be prestations or produits' }, { status: 400 });
    }

    const doc = await CategoryOrder.findOne({ type }).lean();
    return NextResponse.json({ order: doc?.order ?? [] });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/category-order ───────────────────────────────────────────────
// Admin — met à jour l'ordre des catégories
// Body: { type: "prestations"|"produits", order: ["Cat1", "Cat2", ...] }
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { type, order } = await req.json();

    if (type !== 'prestations' && type !== 'produits') {
      return NextResponse.json({ error: 'type must be prestations or produits' }, { status: 400 });
    }
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array' }, { status: 400 });
    }

    const doc = await CategoryOrder.findOneAndUpdate(
      { type },
      { order },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ order: doc?.order ?? order });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/category-order?type=...&nom=... ─────────────────────────────
// Admin — supprime DÉFINITIVEMENT une catégorie : tous les éléments (prestations
// ou produits) qui la portent sont supprimés, et la catégorie est retirée de
// l'ordre d'affichage. Action irréversible.
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const type = req.nextUrl.searchParams.get('type');
    const nom  = req.nextUrl.searchParams.get('nom');

    if (type !== 'prestations' && type !== 'produits') {
      return NextResponse.json({ error: 'type must be prestations or produits' }, { status: 400 });
    }
    if (typeof nom !== 'string' || !nom.trim()) {
      return NextResponse.json({ error: 'nom de catégorie requis.' }, { status: 400 });
    }

    // Suppression des éléments rattachés à la catégorie.
    const Model = type === 'prestations' ? Prestation : Produit;
    const result = await (Model as any).deleteMany({ categorie: nom });

    // Retrait de la catégorie de l'ordre d'affichage.
    await CategoryOrder.updateOne({ type }, { $pull: { order: nom } });

    return NextResponse.json({
      message: 'Catégorie supprimée.',
      deletedCount: result.deletedCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
