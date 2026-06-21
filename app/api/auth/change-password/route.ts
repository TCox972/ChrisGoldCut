import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';
import { validatePassword } from '@/lib/password';

// ─── POST /api/auth/change-password ─────────────────────────────────────────
// Permet à un utilisateur connecté de changer son mot de passe.
// Body : { currentPassword: string, newPassword: string }
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mot de passe actuel et nouveau mot de passe requis.' },
        { status: 400 },
      );
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const userId = (session!.user as any).id;
    const user = await User.findById(userId).select('password');

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Le mot de passe actuel est incorrect.' },
        { status: 400 },
      );
    }

    // Hasher et sauvegarder le nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);

    await User.collection.updateOne(
      { _id: user._id },
      { $set: { password: hashed } },
    );

    return NextResponse.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('[POST /api/auth/change-password]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
