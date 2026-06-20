import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Whitelist stricte : on n'accepte que ces MIME types images
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

// ─── POST /api/upload ────────────────────────────────────────────────────────
// Admin — upload une image sur Cloudinary et retourne l'URL
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Vérifier que la config Cloudinary est bien posée
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[POST /api/upload] Cloudinary env vars manquantes.');
      return NextResponse.json({ error: 'Service d\'upload indisponible.' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    // Validation type MIME (whitelist)
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté (${file.type || 'inconnu'}). Formats acceptés : JPG, PNG, WEBP, AVIF, GIF.` },
        { status: 415 },
      );
    }

    // Validation taille (avant lecture en mémoire)
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : ${MAX_BYTES / 1024 / 1024} Mo.` },
        { status: 413 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Fichier vide.' }, { status: 400 });
    }

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload sur Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'goldcut/produits',
      resource_type: 'image', // refuse définitivement tout ce qui n'est pas image côté Cloudinary
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
