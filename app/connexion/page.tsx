'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const errorMessages: Record<string, string> = {
  CredentialsSignin: 'Email ou mot de passe incorrect.',
  AccessDenied:      'Accès refusé.',
  Default:           'Une erreur est survenue. Réessayez.',
};

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  );
}

function ConnexionContent() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const searchParams = useSearchParams();

  const urlError     = searchParams.get('error');
  const displayError = error || (urlError ? (errorMessages[urlError] ?? errorMessages.Default) : '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const ok = await login(email, password);

    if (!ok) {
      setLoading(false);
      setError('Email ou mot de passe incorrect.');
      return;
    }

    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) { window.location.href = callbackUrl; return; }

    // Récupération du rôle avec retries : NextAuth peut ne pas avoir
    // encore propagé la session juste après signIn.
    let role: string | undefined;
    for (let i = 0; i < 6; i++) {
      try {
        const session = await getSession();
        role = (session?.user as any)?.role;
        if (role) break;
      } catch {
        // ignore — on retentera
      }
      await new Promise(r => setTimeout(r, 150));
    }

    window.location.href = (role === 'admin' || role === 'employe')
      ? '/admin/reservations'
      : '/compte/informations';
  };

  return (
    <main>
      <Navbar dark />
      <div className="relative min-h-screen flex flex-col">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80)' }} />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(20,16,10,0.7)' }} />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
          <div className="w-full max-w-md rounded-lg p-10"
            style={{ backgroundColor: 'rgba(30,25,15,0.92)', border: '1px solid rgba(212,160,23,0.3)' }}>

            <h1 className="font-display text-xl tracking-[0.25em] uppercase text-white text-center mb-8 font-bold">
              Identifiez Vous
            </h1>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {displayError && (
                <p className="text-red-400 text-xs text-center font-body bg-red-900/20 rounded px-3 py-2">
                  {displayError}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-gold w-full mt-2 disabled:opacity-60">
                {loading ? 'Connexion...' : 'Se Connecter'}
              </button>
            </form>

            <Link href="/mot-de-passe-oublie"
              className="block text-center font-body text-xs text-white/40 mt-4 cursor-pointer hover:text-yellow-400 transition-colors">
              Mot de passe oublié ?
            </Link>

            <div className="border-t border-white/10 mt-6 pt-6 text-center">
              <p className="font-body text-sm text-white/50 mb-2">Vous n'êtes pas encore des nôtres ?</p>
              <Link href="/inscription" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
