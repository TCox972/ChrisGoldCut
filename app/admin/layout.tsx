'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Calendar, Scissors, Package, Users, UserCog, CalendarOff, LogOut, TrendingUp, ExternalLink, Image as ImageIcon } from 'lucide-react';

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

  const handleLogout = async () => { await logout(); };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <div className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80)' }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display font-black tracking-[0.15em] text-base">
              <span style={{ color: '#D4A017' }}>GOLD</span> <span className="text-gray-900">CUT</span>
            </span>
            <span className="bg-gray-100 text-gray-500 font-body text-xs px-3 py-1 rounded-full border border-gray-200">
              {user?.isAdmin ? 'Admin' : 'Employé'}
            </span>
          </div>
          {user && (
            <span className="text-gray-400 text-sm font-body hidden md:block">
              Bonjour, {user.prenom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-yellow-600 transition-colors"
            title="Retourner au site public"
          >
            <ExternalLink size={15} /> Voir le site
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 flex-shrink-0">
          <nav className="pt-4">
            {navItems
              .filter(item => !item.adminOnly || user?.isAdmin)
              .map(item => (
                <Link key={item.href} href={item.href}
                  className={`admin-nav-item flex items-center gap-3 ${pathname.startsWith(item.href) ? 'active' : ''}`}>
                  <item.icon size={16} /> {item.label}
                </Link>
              ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
