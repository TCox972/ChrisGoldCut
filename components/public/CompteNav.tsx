'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/compte/informations', label: 'Mes informations' },
  { href: '/compte/reservations', label: 'Mes réservations' },
  { href: '/compte/achats',       label: 'Mes achats' },
];

export default function CompteNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-8 bg-black/30 rounded p-1 w-fit">
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`px-5 py-2 rounded text-xs font-display tracking-[0.15em] uppercase transition-all duration-200
            ${pathname === l.href ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-white/60 hover:text-white'}`}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
