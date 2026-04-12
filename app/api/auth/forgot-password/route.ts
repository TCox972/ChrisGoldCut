import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendMail } from '@/lib/mail';

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
// Génère un token de réinitialisation et envoie un e-mail au client.
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

    // Toujours répondre 200 pour ne pas révéler si le compte existe
    const successMsg = 'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.';

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ message: successMsg });
    }

    // Générer un token sécurisé + expiration 1h
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Écriture via driver natif (bypass HMR schema cache)
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { resetToken: token, resetTokenExpiry: expiry } },
    );

    // Construire le lien de réinitialisation
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // Envoyer l'e-mail
    await sendMail({
      to: user.email,
      subject: 'Gold Cut — Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; letter-spacing: 3px; margin: 0;">
              <span style="color: #D4A017;">GOLD</span> <span style="color: #111;">CUT</span>
            </h1>
          </div>
          <h2 style="font-size: 18px; color: #111; margin-bottom: 8px;">Réinitialisation du mot de passe</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            Bonjour <strong>${user.prenom}</strong>,
          </p>
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe.
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
              style="display: inline-block; background: #D4A017; color: #111; font-weight: bold;
                font-size: 14px; letter-spacing: 1px; text-decoration: none;
                padding: 14px 32px; border-radius: 6px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="font-size: 12px; color: #999; line-height: 1.6;">
            Ce lien est valable <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 11px; color: #bbb; text-align: center;">
            Gold Cut — Salon de Coiffure Premium
          </p>
        </div>
      `,
    });

    return NextResponse.json({ message: successMsg });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
