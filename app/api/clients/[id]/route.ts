import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import CommandeAchat from '@/models/CommandeAchat';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

type Params = { params: { id: string } };

// ─── GET /api/clients/[id] ────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();

    const client = await User.findById(params.id).select('-password').lean();
    if (!client) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });

    const reservations = await Reservation.find({ userId: params.id })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ ...client, reservations });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/clients/[id] ─────────────────────────────────────────────────
// Permet de blacklister / dé-blacklister un client.
// Body : { blackliste: boolean }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    if (typeof body.blackliste !== 'boolean') {
      return NextResponse.json(
        { error: 'Le champ blackliste (boolean) est requis.' },
        { status: 400 },
      );
    }

    // Bypass Mongoose schema cache (HMR) — écriture directe via driver natif
    const result = await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { $set: { blackliste: body.blackliste } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
    }

    // Relire via driver natif pour retourner le doc à jour
    const updated = await User.collection.findOne(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { projection: { password: 0 } },
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/clients/[id] ─────────────────────────────────────────────────
// Règles de sécurité :
// 1. Un admin ne peut pas se supprimer lui-même.
// 2. Un admin ne peut pas supprimer un autre admin (cible explicitement les comptes
//    clients/employés ; gérer les droits admin via une console séparée).
// 3. Cascade : on annule les RDV futurs et on dissocie les commandes existantes
//    (userId → null) plutôt que de les laisser orphelines.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();

    // Garde 1 : auto-suppression interdite
    const currentId = (session!.user as any).id;
    if (params.id === currentId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' },
        { status: 403 },
      );
    }

    // Garde 2 : on ne supprime pas un autre admin via cette route
    const target = await User.findById(params.id).select('role').lean();
    if (!target) {
      return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
    }
    if (target.role === 'admin') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un autre compte administrateur.' },
        { status: 403 },
      );
    }

    // Cascade
    const targetObjectId = new mongoose.Types.ObjectId(params.id);
    const now = new Date();
    await Reservation.updateMany(
      { userId: targetObjectId, date: { $gte: now }, statut: { $ne: 'annule' } },
      { $set: { statut: 'annule' } },
    );
    await CommandeAchat.updateMany(
      { userId: targetObjectId },
      { $set: { userId: null } },
    );

    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Client supprimé.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
