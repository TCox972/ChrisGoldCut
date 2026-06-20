import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prestations — Coiffeur Homme à Ducos, Martinique',
  description:
    "Toutes les prestations de votre coiffeur à Ducos (Martinique) : coupes homme, dégradés, " +
    "barbe, soins capillaires. Tarifs clairs et réservation en ligne avec Gold Cut.",
  alternates: { canonical: '/prestations' },
  openGraph: {
    title: 'Prestations — Gold Cut, Coiffeur Ducos Martinique',
    description:
      'Coupe, dégradé, soin barbe, soin cheveux : découvrez nos prestations à Ducos (Martinique).',
    url: '/prestations',
  },
};

export default function PrestationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
