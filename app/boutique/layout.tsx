import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boutique — Produits soin barbe & cheveux à Ducos, Martinique',
  description:
    "La boutique de Gold Cut : shampoings, soins barbe, sérums et accessoires pour entretenir " +
    "vos cheveux et votre barbe à Ducos (Martinique). Sélection professionnelle proposée par " +
    "votre coiffeur Christopher.",
  alternates: { canonical: '/boutique' },
  openGraph: {
    title: 'Boutique — Gold Cut, Coiffeur Ducos Martinique',
    description: 'Produits professionnels barbe et cheveux à Ducos, Martinique.',
    url: '/boutique',
  },
};

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
