'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

type Status = 'loading' | 'success' | 'expired' | 'error';

export default function VerifierEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    // En dev, React StrictMode monte deux fois : on garde un seul appel.
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
        } else if (data.error === 'expired') {
          setStatus('expired');
        } else {
          setStatus('error');
          setMessage(data.error ?? 'Lien invalide.');
        }
      } catch {
        setStatus('error');
        setMessage('Erreur réseau. Réessayez.');
      }
    })();
  }, [token]);

  const content = {
    loading: {
      title: 'Validation en cours…',
      text:  'Merci de patienter pendant la vérification de votre compte.',
    },
    success: {
      title: 'Compte validé !',
      text:  'Votre adresse e-mail est confirmée. Vous pouvez maintenant vous connecter.',
    },
    expired: {
      title: 'Lien expiré',
      text:  'Ce lien de validation a expiré. Reconnectez-vous pour en recevoir un nouveau.',
    },
    error: {
      title: 'Validation impossible',
      text:  message || 'Ce lien est invalide ou a déjà été utilisé.',
    },
  }[status];

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
          <div className="w-full max-w-md rounded-lg p-10 text-center"
            style={{ backgroundColor: 'rgba(30,25,15,0.92)', border: '1px solid rgba(212,160,23,0.3)' }}>

            <h1 className="font-display text-xl tracking-[0.25em] uppercase text-white mb-6 font-bold">
              {content.title}
            </h1>
            <p className="font-body text-sm text-white/70 leading-relaxed mb-8">
              {content.text}
            </p>

            {status !== 'loading' && (
              <Link href="/connexion" className="btn-gold inline-block px-8">
                Aller à la connexion
              </Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
