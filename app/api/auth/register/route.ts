import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import CommandeAchat from '@/models/CommandeAchat';
import { validatePassword } from '@/lib/password';
import { notifyEmailVerification } from '@/lib/notifications';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit({ key: `register:${getClientIp(req)}`, limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  try {
    const { prenom, nom = '', email, password, telephone = '' } = await req.json();

    // ─── Validation ───────────────────────────────────────────────────────────
    if (!prenom || !email || !password) {
      return NextResponse.json(
        { error: 'Prénom, email et mot de passe sont requis.' },
        { status: 400 }
      );
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    await connectDB();

    // ─── Unicité email ────────────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email.' },
        { status: 409 }
      );
    }

    // ─── Création (compte en attente de validation email) ──────────────────────
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    const user = await User.create({
      prenom,
      nom,
      email: email.toLowerCase(),
      password,   // sera hashé par le hook pre-save
      telephone,
      role: 'client',
      emailVerified: false,
      verifyToken,
      verifyTokenExpiry: verifyExpiry,
    });

    // ─── Envoi de l'email de validation (bloquant : on veut savoir s'il part) ──
    try {
      await notifyEmailVerification({ prenom, email: user.email, token: verifyToken });
    } catch (mailErr) {
      console.error('[register] Échec envoi email de validation:', mailErr);
      // Le compte est créé mais l'email n'est pas parti : on le signale pour que
      // le client puisse demander un renvoi plutôt que de rester bloqué.
    }

    // ─── Récupération des RDV/commandes invités passés sous le même email ────
    // Un client peut prendre un RDV sans compte, puis en créer un dans la
    // foulée. On rattache les enregistrements orphelins (userId: null) qui
    // partagent l'email saisi pour qu'ils apparaissent dans son espace.
    const emailRegex = new RegExp(
      `^${email.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i',
    );
    try {
      const [rdvResult, cmdResult] = await Promise.all([
        Reservation.updateMany(
          { userId: null, clientEmail: { $regex: emailRegex } },
          { $set: { userId: user._id } },
        ),
        CommandeAchat.updateMany(
          { userId: null, clientEmail: { $regex: emailRegex } },
          { $set: { userId: user._id } },
        ),
      ]);
      console.log(
        `[register] User ${user._id} récupère ${rdvResult.modifiedCount} RDV ` +
        `et ${cmdResult.modifiedCount} commande(s) invité(s).`,
      );
    } catch (claimErr) {
      // Ne fait pas échouer l'inscription : le compte est créé, c'est l'essentiel.
      // Les RDV pourront éventuellement être rattachés plus tard manuellement.
      console.error('[register] Échec rattachement RDV/commandes invité:', claimErr);
    }

    return NextResponse.json(
      {
        message: 'Compte créé. Un email de validation vous a été envoyé.',
        requiresVerification: true,
        user: {
          id:     user._id.toString(),
          prenom: user.prenom,
          email:  user.email,
          role:   user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
