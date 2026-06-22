'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';
import { validatePassword } from '@/lib/password';
import Link from 'next/link';

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionContent />
    </Suspense>
  );
}

function InscriptionContent() {
  const searchParams = useSearchParams();
  const inviteToken  = searchParams.get('invite') || '';

  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', password: '', confirm: '' });
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [requiresVerif,setRequiresVerif]= useState(true);
  const [emailLocked,  setEmailLocked]  = useState(false);
  const { register } = useAuth();

  // Préremplissage depuis une invitation (lien envoyé par le salon).
  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/account-invites/${inviteToken}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.email) {
          setForm(f => ({
            ...f,
            prenom:    d.prenom || '',
            nom:       d.nom || '',
            email:     d.email,
            telephone: d.telephone || '',
          }));
          setEmailLocked(true);
        }
      })
      .catch(() => {});
  }, [inviteToken]);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Critères de robustesse du mot de passe (affichage temps réel)
  const pwd = form.password;
  const passwordCriteria = [
    { label: 'Au moins 10 caractères', ok: pwd.length >= 10 },
    { label: 'Une majuscule',          ok: /[A-Z]/.test(pwd) },
    { label: 'Un chiffre',             ok: /[0-9]/.test(pwd) },
    { label: 'Un caractère spécial',   ok: /[^A-Za-z0-9]/.test(pwd) },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    const pwdError = validatePassword(form.password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    setLoading(true);
    const result = await register(form.prenom, form.email, form.password, {
      nom: form.nom,
      telephone: form.telephone,
      inviteToken: inviteToken || undefined,
    });
    setLoading(false);

    if (result.ok) {
      setRequiresVerif(result.requiresVerification !== false);
      setSubmitted(true);
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

            {submitted ? (
              <div className="text-center">
                <h1 className="font-display text-xl tracking-[0.25em] uppercase text-white mb-6 font-bold">
                  {requiresVerif ? 'Vérifiez vos emails' : 'Compte créé !'}
                </h1>
                {requiresVerif ? (
                  <>
                    <p className="font-body text-sm text-white/70 leading-relaxed mb-2">
                      Un email de validation a été envoyé à{' '}
                      <strong className="text-white">{form.email}</strong>.
                    </p>
                    <p className="font-body text-sm text-white/70 leading-relaxed mb-6">
                      Cliquez sur le lien qu'il contient pour activer votre compte,
                      puis connectez-vous. Pensez à vérifier vos spams.
                    </p>
                  </>
                ) : (
                  <p className="font-body text-sm text-white/70 leading-relaxed mb-6">
                    Votre compte est actif. Vous pouvez dès maintenant vous connecter
                    pour gérer vos rendez-vous et votre fidélité.
                  </p>
                )}
                <Link href="/connexion" className="btn-gold inline-block px-8">
                  Aller à la connexion
                </Link>
              </div>
            ) : (
            <>
            <h1 className="font-display text-xl tracking-[0.25em] uppercase text-white text-center mb-8 font-bold">
              Créer Un Compte
            </h1>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <input name="prenom" value={form.prenom} onChange={handle}
                  placeholder="Prénom *" required className="input-gold text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <input name="nom" value={form.nom} onChange={handle}
                  placeholder="Nom" className="input-gold text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              </div>
              <input name="email" type="email" value={form.email} onChange={handle}
                placeholder="Email *" required readOnly={emailLocked}
                className={`input-gold text-white ${emailLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input name="telephone" type="tel" value={form.telephone} onChange={handle}
                placeholder="Téléphone (+596 696 ...)" className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <input name="password" type="password" value={form.password} onChange={handle}
                placeholder="Mot de passe *" required className="input-gold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {/* Critères de robustesse — passent au vert quand respectés */}
              <ul className="flex flex-col gap-1 -mt-1">
                {passwordCriteria.map(c => (
                  <li key={c.label} className="flex items-center gap-2 text-xs"
                    style={{ color: c.ok ? '#6ee7a8' : 'rgba(255,255,255,0.45)' }}>
                    <span>{c.ok ? '✓' : '○'}</span>
                    {c.label}
                  </li>
                ))}
              </ul>

              <input name="confirm" type="password" value={form.confirm} onChange={handle}
                placeholder="Confirmer mot de passe *" required className="input-gold text-white"
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
            </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
