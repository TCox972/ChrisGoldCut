'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

// Clé de stockage du choix de l'utilisateur.
// Incrémenter le suffixe (-v1) si la politique cookies change : la bannière
// réapparaîtra alors pour redemander le consentement.
const STORAGE_KEY = 'goldcut-cookie-consent-v1';

export type CookieChoice = 'accepted' | 'refused';

/** Renvoie le choix enregistré, ou null si l'utilisateur n'a pas encore répondu. */
export function getCookieConsent(): CookieChoice | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'refused' ? v : null;
}

export default function CookieConsent() {
  const pathname = usePathname();
  // visible reste false au premier rendu (SSR + hydratation) pour éviter tout
  // mismatch : c'est l'effet client qui décide d'afficher la bannière ou non.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  const decide = (choice: CookieChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* localStorage indisponible (navigation privée stricte) : on masque quand même */
    }
    setVisible(false);
  };

  // Pas de bannière dans l'espace d'administration.
  if (pathname?.startsWith('/admin')) return null;
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div
        className="mx-auto max-w-4xl rounded-xl shadow-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ backgroundColor: 'rgba(20,16,10,0.97)', borderColor: 'rgba(212,160,23,0.35)' }}
      >
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={22} className="flex-shrink-0 mt-0.5" style={{ color: '#D4A017' }} />
          <p className="font-body text-sm text-white/80 leading-relaxed">
            Nous utilisons des cookies pour assurer le bon fonctionnement du site et améliorer
            votre expérience. Vous pouvez les accepter ou les refuser.{' '}
            <Link href="/confidentialite" className="underline hover:text-yellow-400 transition-colors"
              style={{ color: '#D4A017' }}>
              En savoir plus
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => decide('refused')}
            className="font-body text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg border border-white/20
              text-white/80 hover:text-white hover:border-white/40 transition-colors"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="font-body text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#D4A017', color: '#111' }}
          >
            Accepter
          </button>
          <button
            type="button"
            onClick={() => decide('refused')}
            aria-label="Fermer (refuser)"
            className="text-white/40 hover:text-white/80 transition-colors sm:ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
