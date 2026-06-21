import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword } from '@/lib/password';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Réinitialise le mot de passe via le token reçu par e-mail.
// Body : { token: string, password: string }
export async function POST(req: NextRequest) {
  const rl = rateLimit({ key: `reset:${getClientIp(req)}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  try {
    await connectDB();
    const { token, password } = await req.json();

    // Typage strict : empêche l'injection d'opérateurs NoSQL (ex. {"$ne":null})
    // via le driver natif Mongo qui, contrairement à Mongoose, ne caste pas.
    if (typeof token !== 'string' || typeof password !== 'string' || !token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe sont requis.' },
        { status: 400 },
      );
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    // Recherche via driver natif (bypass HMR schema cache)
    const user = await User.collection.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré. Veuillez refaire une demande.' },
        { status: 400 },
      );
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // Mise à jour via driver natif
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashed },
        $unset: { resetToken: '', resetTokenExpiry: '' },
      },
    );

    return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
