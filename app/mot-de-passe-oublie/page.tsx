'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
      } else {
        setSent(true);
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
              Mot de passe oublié
            </h1>

            {sent ? (
              <div className="text-center">
                <p className="font-body text-sm text-white/70 mb-6 leading-relaxed">
                  Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.
                  Vérifiez votre boîte de réception.
                </p>
                <Link href="/connexion" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <>
                <p className="font-body text-sm text-white/50 text-center mb-6">
                  Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
                </p>

                <form onSubmit={submit} className="flex flex-col gap-4">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Votre adresse e-mail" required className="input-gold text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

                  {error && (
                    <p className="text-red-400 text-xs text-center font-body bg-red-900/20 rounded px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={loading} className="btn-gold w-full mt-2 disabled:opacity-60">
                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                  </button>
                </form>

                <div className="border-t border-white/10 mt-6 pt-6 text-center">
                  <Link href="/connexion" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                    Retour à la connexion
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
