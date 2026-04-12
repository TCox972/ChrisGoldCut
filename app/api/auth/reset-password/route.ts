import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Réinitialise le mot de passe via le token reçu par e-mail.
// Body : { token: string, password: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe sont requis.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 },
      );
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
