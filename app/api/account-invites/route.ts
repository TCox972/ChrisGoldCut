import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import AccountInvite from '@/models/AccountInvite';
import Reservation from '@/models/Reservation';
import User from '@/models/User';
import { requireStaff } from '@/lib/auth';
import { notifyAccountInvite } from '@/lib/notifications';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── POST /api/account-invites ───────────────────────────────────────────────
// Staff — crée une invitation à créer un compte et envoie le lien par email.
// Body : { email, prenom?, nom?, telephone?, reservationId? }
//   reservationId présent (prestation payée) → 1er point fidélité à l'inscription.
export async function POST(req: NextRequest) {
  const { error } = await requireStaff();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const telephone = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const reservationId = typeof body.reservationId === 'string' ? body.reservationId : null;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
    }

    // Si un compte existe déjà avec cet email, inutile d'inviter.
    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email.' },
        { status: 409 },
      );
    }

    // Vérifier la réservation si fournie (et la lier pour le point fidélité).
    if (reservationId) {
      const rdv = await Reservation.findById(reservationId).select('_id').lean();
      if (!rdv) {
        return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await AccountInvite.create({
      token, email, prenom, nom, telephone, reservationId, expiresAt,
    });

    try {
      await notifyAccountInvite({ prenom, email, token, withReward: !!reservationId });
    } catch (mailErr) {
      console.error('[account-invites] échec envoi email:', mailErr);
      return NextResponse.json(
        { error: 'Invitation créée mais l\'email n\'a pas pu être envoyé.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: 'Invitation envoyée.' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/account-invites]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
