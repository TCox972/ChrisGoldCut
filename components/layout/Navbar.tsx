'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '/',            label: 'Accueil' },
  { href: '/prestations', label: 'Prestations' },
  { href: '/boutique',    label: 'Boutique' },
];
const navLinksRight = [
  { href: '/panier',      label: 'Panier' },
  { href: '/reservation', label: 'Prenez RDV' },
  { href: '/compte',      label: 'Compte' },
];

export default function Navbar({ dark = true }: { dark?: boolean }) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const base = dark ? 'text-white/80 hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600';
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${dark ? 'bg-black/60 backdrop-blur-md border-b border-white/10' : 'bg-white border-b border-gray-100 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">

        {/* Left */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`font-display text-[10px] tracking-[0.22em] uppercase transition-colors duration-200 ${isActive(l.href) ? 'text-yellow-400' : base}`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Logo */}
        <Link href="/" className="flex flex-col items-center flex-shrink-0">
          <div className="flex flex-col items-center leading-none">
            <div className={`font-display text-lg font-black tracking-[0.15em] uppercase ${dark ? 'text-white' : 'text-gray-900'}`}>
              GOLD CUT
            </div>
<<<<<<< HEAD
            <div className="font-script text-xs tracking-wider" style={{ color: '#D4A017' }}>By Christopher</div>
=======
            <div className="font-script text-xs tracking-wider" style={{ color: '#D4A017' }}>Gold-Cuts</div>
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
          </div>
        </Link>

        {/* Right */}
        <div className="hidden md:flex items-center gap-8">
          {navLinksRight.map(l => (
            <Link key={l.href} href={l.href}
              className={`font-display text-[10px] tracking-[0.22em] uppercase transition-colors duration-200 relative
                ${l.href === '/reservation' ? 'text-yellow-400 font-bold' : isActive(l.href) ? 'text-yellow-400' : base}`}>
              {l.label}
              {l.href === '/panier' && totalItems > 0 && (
                <span className="absolute -top-2 -right-3 bg-yellow-400 text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
              {l.href === '/compte' && isAuthenticated && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block ml-1 mb-0.5" />
              )}
            </Link>
          ))}
          {isAuthenticated && (user?.isAdmin || user?.isEmploye) && (
            <Link href="/admin/reservations"
              className="font-display text-[10px] tracking-[0.22em] uppercase transition-colors duration-200 text-yellow-400 font-bold">
              Admin
            </Link>
          )}
          {isAuthenticated && (
            <button onClick={() => logout()}
              className={`font-display text-[10px] tracking-[0.22em] uppercase transition-colors duration-200 ${base}`}>
              Déco.
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button className={`md:hidden ${dark ? 'text-white' : 'text-gray-800'}`} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className={`md:hidden px-6 py-6 flex flex-col gap-5 border-t ${dark ? 'bg-black/90 border-white/10' : 'bg-white border-gray-100'}`}>
          {[...navLinks, ...navLinksRight].map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`font-display text-xs tracking-[0.2em] uppercase ${isActive(l.href) ? 'text-yellow-400' : base}`}>
              {l.label}
            </Link>
          ))}
          {isAuthenticated && (user?.isAdmin || user?.isEmploye) && (
            <Link href="/admin/reservations" onClick={() => setOpen(false)}
              className="font-display text-xs tracking-[0.2em] uppercase text-yellow-400 font-bold">
              Admin
            </Link>
          )}
          {isAuthenticated && (
            <button onClick={() => { logout(); setOpen(false); }}
              className={`font-display text-xs tracking-[0.2em] uppercase text-left ${base}`}>
              Se déconnecter
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
