import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prestations — Salon de coiffure mixte à Ducos, Martinique',
  description:
    "Toutes les prestations de Gold Cut, salon mixte à Ducos (Martinique) : coupes homme et femme, " +
    "dégradés, barbe, soins capillaires. Tarifs clairs et réservation en ligne.",
  alternates: { canonical: '/prestations' },
  openGraph: {
    title: 'Prestations — Gold Cut, Salon mixte Ducos Martinique',
    description:
      'Coupe, dégradé, soin barbe, soin cheveux : nos prestations homme et femme à Ducos (Martinique).',
    url: '/prestations',
  },
};

export default function PrestationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
