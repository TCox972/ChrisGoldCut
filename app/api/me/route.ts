import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/me ──────────────────────────────────────────────────────────────
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user = await User.findById((session!.user as any).id)
      .select('-password')
      .lean();

    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PUT /api/me ──────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    // Champs autorisés à modifier par le client lui-même
    const allowed = ['prenom', 'nom', 'telephone', 'autresPersonnes'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

<<<<<<< HEAD
    // Max 3 personnes supplémentaires
    if (Array.isArray(update.autresPersonnes) && update.autresPersonnes.length > 3) {
      return NextResponse.json(
        { error: 'Vous pouvez ajouter 3 personnes supplémentaires maximum.' },
        { status: 400 },
      );
    }

=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    const updated = await User.findByIdAndUpdate(
      (session!.user as any).id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
