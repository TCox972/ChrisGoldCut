import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// ─── POST /api/auth/verify-email ────────────────────────────────────────────
// Valide un compte via le token reçu par e-mail.
// Body : { token: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token } = await req.json();

    if (!token) {
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
