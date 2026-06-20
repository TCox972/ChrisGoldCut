import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import { requireAdmin } from '@/lib/auth';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Génère un mot de passe temporaire lisible (12 caractères alphanumériques sans
 * caractères ambigus type 0/O, 1/l/I). On utilise crypto.randomInt pour ne pas
 * dépendre de Math.random.
 */
function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

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

    // Mot de passe temporaire : généré lisible et renvoyé UNE seule fois à
    // l'admin pour qu'il puisse le communiquer à l'employé. Le hook pre('save')
    // de User le hashera avant stockage.
    const tempPassword = generateTempPassword();

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
    return NextResponse.json(
      { ...safeUser, tempPassword },
      { status: 201 },
    );
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

    // Cascade : on dissocie les RDV futurs assignés à cet employé pour qu'ils
    // ne pointent plus sur un employeId orphelin (l'admin pourra les réassigner).
    const targetObjectId = new mongoose.Types.ObjectId(id);
    const now = new Date();
    const reassigned = await Reservation.updateMany(
      { employeId: targetObjectId, date: { $gte: now }, statut: { $ne: 'annule' } },
      { $set: { employeId: null } },
    );

    await User.findByIdAndDelete(id);
    return NextResponse.json({
      message: 'Employé supprimé.',
      reassignedReservations: reassigned.modifiedCount ?? 0,
    });
  } catch (err) {
    console.error('[DELETE /api/employes]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
