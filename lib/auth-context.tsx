'use client';

/**
 * auth-context.tsx — Remplace le mock par NextAuth.js
 * Hook useAuth() compatible avec le reste du code existant.
 */

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export type AuthUser = {
  id:        string;
  prenom:    string;
  nom:       string;
  email:     string;
  telephone: string;
  role:      'client' | 'admin' | 'employe';
  isAdmin:   boolean;
  isEmploye: boolean;
};

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user: AuthUser | null = session?.user
    ? {
        id:        (session.user as any).id        ?? '',
        prenom:    (session.user as any).prenom    ?? session.user.name ?? '',
        nom:       '',
        email:     session.user.email              ?? '',
        telephone: (session.user as any).telephone ?? '',
        role:      (session.user as any).role ?? 'client',
        isAdmin:   (session.user as any).role === 'admin',
        isEmploye: (session.user as any).role === 'employe',
      }
    : null;

  const login = async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.ok) return { ok: true };
    console.error('[useAuth] login error:', result?.error);
    return { ok: false, error: result?.error ?? undefined };
  };

  const logout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  const register = async (
    prenom: string,
    email: string,
    password: string,
    extras: { nom?: string; telephone?: string } = {},
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prenom, email, password, ...extras }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Erreur inconnue.' };

      // Pas de connexion automatique : le compte doit d'abord être validé via
      // le lien envoyé par email.
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erreur réseau.' };
    }
  };

  return {
    user,
    isAuthenticated: !!session?.user,
    isLoading:       status === 'loading',
    login,
    logout,
    register,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
