'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/connexion'), 3000);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
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
              Nouveau mot de passe
            </h1>

            {success ? (
              <div className="text-center">
                <p className="font-body text-sm text-green-400 mb-4">
                  Mot de passe réinitialisé avec succès !
                </p>
                <p className="font-body text-xs text-white/50 mb-6">
                  Redirection vers la connexion...
                </p>
                <Link href="/connexion" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                  Se connecter
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe" required minLength={6}
                  className="input-gold text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirmer le mot de passe" required minLength={6}
                  className="input-gold text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

                {error && (
                  <p className="text-red-400 text-xs text-center font-body bg-red-900/20 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="btn-gold w-full mt-2 disabled:opacity-60">
                  {loading ? 'Réinitialisation...' : 'Réinitialiser'}
                </button>

                <div className="border-t border-white/10 mt-4 pt-4 text-center">
                  <Link href="/connexion" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
