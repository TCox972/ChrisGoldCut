import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import CommandeAchat from '@/models/CommandeAchat';

export async function POST(req: NextRequest) {
  try {
    const { prenom, nom = '', email, password, telephone = '' } = await req.json();

    // ─── Validation ───────────────────────────────────────────────────────────
    if (!prenom || !email || !password) {
      return NextResponse.json(
        { error: 'Prénom, email et mot de passe sont requis.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
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

    // ─── Création ─────────────────────────────────────────────────────────────
    const user = await User.create({
      prenom,
      nom,
      email: email.toLowerCase(),
      password,   // sera hashé par le hook pre-save
      telephone,
      role: 'client',
    });

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
        message: 'Compte créé avec succès.',
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
