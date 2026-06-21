import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '@/lib/mongodb';
import Gallery from '@/models/Gallery';
import { requireAdmin } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type Params = { params: { id: string } };

// ─── DELETE /api/gallery/[id] ────────────────────────────────────────────────
// Admin — supprime une photo : retire de la BDD ET de Cloudinary.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const item = await Gallery.findById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 });
    }

    // Nettoyage Cloudinary (silencieux si l'image n'existe plus là-bas).
    try {
      await cloudinary.uploader.destroy(item.publicId);
    } catch (cloudErr) {
      console.error('[DELETE /api/gallery/:id] Cloudinary cleanup failed:', cloudErr);
      // On continue : la photo doit disparaître du site même si Cloudinary échoue.
    }

    await Gallery.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Photo supprimée.' });
  } catch (err) {
    console.error('[DELETE /api/gallery/:id]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
