'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function InscriptionPage() {
  const [form, setForm] = useState({ prenom: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    const result = await register(form.prenom, form.email, form.password);
    setLoading(false);

    if (result.ok) {
      router.push('/compte/informations');
    } else {
      setError(result.error ?? 'Une erreur est survenue.');
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
              Créer Un Compte
            </h1>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <input name="prenom" value={form.prenom} onChange={handle}
                placeholder="Prénom" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input name="email" type="email" value={form.email} onChange={handle}
                placeholder="Email" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input name="password" type="password" value={form.password} onChange={handle}
                placeholder="Mot de passe (min. 6 caractères)" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input name="confirm" type="password" value={form.confirm} onChange={handle}
                placeholder="Confirmer mot de passe" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {error && (
                <p className="text-red-400 text-xs text-center bg-red-900/20 rounded px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-gold w-full mt-2 disabled:opacity-60">
                {loading ? 'Création...' : 'Créer'}
              </button>
            </form>

            <div className="border-t border-white/10 mt-6 pt-6 text-center">
              <p className="font-body text-sm text-white/50 mb-2">Vous êtes déjà des nôtres ?</p>
              <Link href="/connexion" className="font-body text-sm font-medium" style={{ color: '#D4A017' }}>
                Connectez-vous
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
