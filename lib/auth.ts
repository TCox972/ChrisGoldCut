import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/** Récupère la session courante côté serveur (dans une API route ou Server Component) */
export async function getSession() {
  return getServerSession(authOptions);
}

/** Vérifie que l'utilisateur est connecté. Retourne null + 401 sinon. */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/** Vérifie que l'utilisateur est admin. Retourne null + 403 sinon. */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  if ((session!.user as any).role !== 'admin') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/** Vérifie que l'utilisateur est admin ou employé. Retourne null + 403 sinon. */
export async function requireStaff() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  const role = (session!.user as any).role;
  if (role !== 'admin' && role !== 'employe') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }),
    };
  }
  return { session, error: null };
}
