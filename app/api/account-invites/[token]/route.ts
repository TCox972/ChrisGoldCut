import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AccountInvite from '@/models/AccountInvite';

type Params = { params: { token: string } };

// ─── GET /api/account-invites/[token] ────────────────────────────────────────
// Public — retourne les infos de préremplissage du formulaire d'inscription.
// N'expose pas reservationId ni d'autres détails internes.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const token = params.token;
    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 400 });
    }

    const invite = await AccountInvite.findOne({ token }).lean();
    if (!invite || invite.used || new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation invalide ou expirée.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      email:     invite.email,
      prenom:    invite.prenom,
      nom:       invite.nom,
      telephone: invite.telephone,
    });
  } catch (err) {
    console.error('[GET /api/account-invites/:token]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
