import Link from 'next/link';

const footerLinks = [
  { href: '/le-salon',    label: 'Le Salon' },
  { href: '/contact',     label: 'Contact' },
  { href: '/prestations', label: 'Tarifs' },
];

export default function Footer() {
  return (
    <footer className="bg-dark-800" style={{ backgroundColor: '#111111' }}>
      {/* Wave top */}
      <div className="relative h-16 overflow-hidden" style={{ backgroundColor: '#111111' }}>
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="w-full h-16 bg-white" style={{ clipPath: 'ellipse(45% 100% at 50% 0%)' }} />
        </div>
      </div>

      {/* Logo */}
      <div className="flex justify-center pt-6 pb-8">
        <div className="flex flex-col items-center">
          <div className="font-display text-xl font-black tracking-[0.15em] uppercase text-white">GOLD CUT</div>
          <div className="font-script text-sm" style={{ color: '#D4A017' }}>Gold-Cuts</div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 pb-8 px-6">
        {footerLinks.map(l => (
          <Link key={l.href} href={l.href}
            className="font-display text-[10px] tracking-[0.2em] uppercase text-yellow-400 hover:text-yellow-300 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 py-4 text-center">
        <p className="font-body text-xs text-white/40 tracking-widest">
          Copyright 2025 Gold Cut
        </p>
      </div>
    </footer>
  );
}
