import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

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
