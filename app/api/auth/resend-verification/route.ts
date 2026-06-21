import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { notifyEmailVerification } from '@/lib/notifications';

// ─── POST /api/auth/resend-verification ─────────────────────────────────────
// Renvoie l'email de validation à un compte non encore vérifié.
// Body : { email: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'L\'adresse e-mail est requise.' },
        { status: 400 },
      );
    }

    // Réponse neutre : ne révèle ni l'existence du compte ni son état.
    const successMsg =
      'Si un compte en attente de validation existe avec cette adresse, un nouvel email a été envoyé.';

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // N'envoie que si le compte existe ET n'est pas déjà validé.
    if (user && user.emailVerified === false) {
      const verifyToken  = crypto.randomBytes(32).toString('hex');
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

      await User.collection.updateOne(
        { _id: user._id },
        { $set: { verifyToken, verifyTokenExpiry: verifyExpiry } },
      );

      try {
        await notifyEmailVerification({ prenom: user.prenom, email: user.email, token: verifyToken });
      } catch (mailErr) {
        console.error('[resend-verification] Échec envoi email:', mailErr);
      }
    }

    return NextResponse.json({ message: successMsg });
  } catch (err) {
    console.error('[POST /api/auth/resend-verification]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
