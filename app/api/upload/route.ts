import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── POST /api/upload ────────────────────────────────────────────────────────
// Admin — upload une image sur Cloudinary et retourne l'URL
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload sur Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'goldcut/produits',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto', format: 'webp' },
      ],
    });

    return NextResponse.json({
      url:       result.secure_url,
      publicId:  result.public_id,
    });
  } catch (err) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Erreur lors de l\'upload.' }, { status: 500 });
  }
}

// ─── DELETE /api/upload ──────────────────────────────────────────────────────
// Admin — supprime une image de Cloudinary
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { publicId } = await req.json();
    if (!publicId) {
      return NextResponse.json({ error: 'publicId requis.' }, { status: 400 });
    }

    await cloudinary.uploader.destroy(publicId);
    return NextResponse.json({ message: 'Image supprimée.' });
  } catch (err) {
    console.error('[DELETE /api/upload]', err);
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
