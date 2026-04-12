import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import crypto from 'crypto';

// ─── GET /api/employes ───────────────────────────────────────────────────────
// Liste tous les employés + l'admin (staff)
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const staff = await User.find(
      { role: { $in: ['admin', 'employe'] } },
      { password: 0 }
    ).sort({ role: 1, prenom: 1 }).lean();
    return NextResponse.json(staff);
  } catch (err) {
    console.error('[GET /api/employes]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/employes ──────────────────────────────────────────────────────
// Créer un compte employé (admin only)
// Body: { prenom, nom, email, telephone, societe }
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { prenom, nom, email, telephone, societe } = await req.json();

    if (!prenom || !email) {
      return NextResponse.json(
        { error: 'Prénom et email requis.' },
        { status: 400 }
      );
    }

    // Vérifier unicité email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    // Mot de passe temporaire aléatoire (l'employé utilisera "mot de passe oublié")
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const user = await User.create({
      prenom,
      nom:       nom ?? '',
      email:     email.toLowerCase(),
      telephone: telephone ?? '',
      societe:   societe ?? '',
      password:  tempPassword,
      role:      'employe',
    });

    const { password: _, ...safeUser } = user.toObject();
    return NextResponse.json(safeUser, { status: 201 });
  } catch (err) {
    console.error('[POST /api/employes]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/employes?id=xxx ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis.' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user || user.role === 'admin') {
      return NextResponse.json({ error: 'Impossible de supprimer ce compte.' }, { status: 400 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Employé supprimé.' });
  } catch (err) {
    console.error('[DELETE /api/employes]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
