'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const links = [
  { href: '/compte/informations', label: 'Mes informations' },
  { href: '/compte/reservations', label: 'Mes réservations' },
  { href: '/compte/achats',       label: 'Mes achats' },
];

export default function CompteNav() {
  const pathname = usePathname();
  const router   = useRouter();

  const currentLabel =
    links.find(l => l.href === pathname)?.label ?? links[0].label;

  return (
    <>
      {/* ── Mobile : menu déroulant ── */}
      <div className="md:hidden mb-6">
        <label htmlFor="compte-nav-select" className="sr-only">Section du compte</label>
        <div className="relative">
          <select
            id="compte-nav-select"
            value={pathname}
            onChange={e => router.push(e.target.value)}
            className="w-full appearance-none bg-black/40 border rounded-lg px-4 py-3 pr-10
              font-display text-sm tracking-[0.15em] uppercase font-bold text-white
              focus:outline-none focus:ring-2 focus:ring-yellow-400/40 transition-colors"
            style={{ borderColor: 'rgba(212,160,23,0.5)' }}
          >
            {links.map(l => (
              // L'option par défaut est lue par le mobile : on garde le libellé en majuscules
              <option key={l.href} value={l.href} className="text-gray-900">
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none"
            aria-hidden
          />
        </div>
        {/* Affichage discret de la sélection en cours (utile si le navigateur
            n'affiche pas la valeur du select dans son style natif sombre). */}
        <p className="sr-only">Section actuelle : {currentLabel}</p>
      </div>

      {/* ── Desktop : onglets horizontaux (inchangés) ── */}
      <div className="hidden md:flex gap-1 mb-8 bg-black/30 rounded p-1 w-fit">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={`px-5 py-2 rounded text-xs font-display tracking-[0.15em] uppercase transition-all duration-200
              ${pathname === l.href ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-white/60 hover:text-white'}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
