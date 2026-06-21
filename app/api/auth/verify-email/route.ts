import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// ─── POST /api/auth/verify-email ────────────────────────────────────────────
// Valide un compte via le token reçu par e-mail.
// Body : { token: string }
export async function POST(req: NextRequest) {
  const rl = rateLimit({ key: `verify:${getClientIp(req)}`, limit: 20, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  try {
    await connectDB();
    const { token } = await req.json();

    // Typage strict : empêche l'injection d'opérateurs NoSQL (ex. {"$ne":null})
    // via le driver natif Mongo qui ne caste pas les valeurs.
    if (typeof token !== 'string' || !token) {
      return NextResponse.json(
        { error: 'Token manquant.' },
        { status: 400 },
      );
    }

    // Recherche via driver natif (bypass HMR schema cache)
    const user = await User.collection.findOne({ verifyToken: token });

    if (!user) {
      // Le token peut avoir déjà été consommé (compte déjà validé) → message neutre.
      return NextResponse.json(
        { error: 'Lien invalide ou déjà utilisé. Essayez de vous connecter.' },
        { status: 400 },
      );
    }

    if (user.verifyTokenExpiry && new Date(user.verifyTokenExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'expired' },
        { status: 400 },
      );
    }

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set:   { emailVerified: true },
        $unset: { verifyToken: '', verifyTokenExpiry: '' },
      },
    );

    return NextResponse.json({ message: 'Compte validé avec succès.' });
  } catch (err) {
    console.error('[POST /api/auth/verify-email]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
