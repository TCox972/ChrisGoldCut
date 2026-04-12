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

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.ok) return true;
    console.error('[useAuth] login error:', result?.error);
    return false;
  };

  const logout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  const register = async (
    prenom: string,
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prenom, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Erreur inconnue.' };

      // Connexion automatique après inscription
      const signed = await signIn('credentials', { email, password, redirect: false });
      return signed?.ok ? { ok: true } : { ok: false, error: 'Connexion automatique échouée.' };
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
