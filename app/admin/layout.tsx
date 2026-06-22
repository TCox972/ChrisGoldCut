'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Calendar, Scissors, Package, Users, UserCog, CalendarOff, LogOut, TrendingUp, ExternalLink, Image as ImageIcon, Menu, X } from 'lucide-react';

type NavItem = { href: string; label: string; icon: any; adminOnly?: boolean };

const navItems: NavItem[] = [
  { href: '/admin/reservations', label: 'Réservations', icon: Calendar },
  { href: '/admin/finances',     label: 'Finances',     icon: TrendingUp },
  { href: '/admin/employes',     label: 'Employés',     icon: UserCog,     adminOnly: true },
  { href: '/admin/fermetures',   label: 'Fermetures',   icon: CalendarOff, adminOnly: true },
  { href: '/admin/prestations',  label: 'Prestations',  icon: Scissors,    adminOnly: true },
  { href: '/admin/produits',     label: 'Produits',     icon: Package,     adminOnly: true },
  { href: '/admin/galerie',      label: 'Galerie',      icon: ImageIcon,   adminOnly: true },
  { href: '/admin/clients',      label: 'Clients',      icon: Users,       adminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => { await logout(); };

  // Fermer le tiroir mobile à chaque changement de page
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.isAdmin);

  // Liens de navigation (réutilisés dans la sidebar desktop et le tiroir mobile)
  const navLinks = (
    <>
      {visibleItems.map(item => (
        <Link key={item.href} href={item.href}
          className={`admin-nav-item flex items-center gap-3 ${pathname.startsWith(item.href) ? 'active' : ''}`}>
          <item.icon size={16} /> {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sm:px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Hamburger (mobile / tablette uniquement) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <Menu size={22} />
          </button>

          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 hidden sm:block">
            <div className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80)' }} />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-display font-black tracking-[0.15em] text-sm sm:text-base whitespace-nowrap">
              <span style={{ color: '#D4A017' }}>GOLD</span> <span className="text-gray-900">CUT</span>
            </span>
            <span className="bg-gray-100 text-gray-500 font-body text-xs px-2.5 py-1 rounded-full border border-gray-200 whitespace-nowrap">
              {user?.isAdmin ? 'Admin' : 'Employé'}
            </span>
          </div>
          {user && (
            <span className="text-gray-400 text-sm font-body hidden md:block truncate">
              Bonjour, {user.prenom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-yellow-600 transition-colors"
            title="Retourner au site public"
          >
            <ExternalLink size={15} /> <span className="hidden sm:inline">Voir le site</span>
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <LogOut size={15} /> <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop (lg+) */}
        <aside className="w-52 bg-white border-r border-gray-200 flex-shrink-0 hidden lg:block">
          <nav className="pt-4">{navLinks}</nav>
        </aside>

        {/* Tiroir mobile / tablette */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
            {/* Panneau */}
            <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[80%] bg-white shadow-xl flex flex-col">
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                <span className="font-display font-black tracking-[0.15em] text-base">
                  <span style={{ color: '#D4A017' }}>GOLD</span> <span className="text-gray-900">CUT</span>
                </span>
                <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"
                  className="text-gray-400 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <nav className="pt-4 flex-1 overflow-y-auto">{navLinks}</nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
