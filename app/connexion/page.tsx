'use client';

import { useState } from 'react';
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
    setLoading(false);

if (ok) {
  const callbackUrl = searchParams.get('callbackUrl');
  if (callbackUrl) { window.location.href = callbackUrl; return; }

  try {
    const session = await getSession();
    const role = (session?.user as any)?.role;
    window.location.href = (role === 'admin' || role === 'employe') ? '/admin/reservations' : '/compte/informations';
  } catch {
    window.location.href = '/compte/informations';
  }
}
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

            <p className="text-center font-body text-xs text-white/40 mt-4 cursor-pointer hover:text-yellow-400 transition-colors">
              Mot de passe oublié ?
            </p>

            <div className="border-t border-white/10 mt-6 pt-6 text-center">
              <p className="font-body text-sm text-white/50 mb-2">Vous n'êtes pas encore des nôtres ?</p>
              <Link href="/inscription" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                Créer un compte
              </Link>
            </div>

            <div className="mt-6 p-3 rounded text-xs font-body text-white/40 text-center"
              style={{ backgroundColor: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.15)' }}>
              <p className="font-semibold text-yellow-400/60 mb-1">Comptes de démo</p>
              <p>Client : dupont.b@gmail.com / password123</p>
              <p>Admin  : admin@goldcut.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
