import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    "Créez votre compte client Gold Cut pour réserver et gérer vos rendez-vous chez votre " +
    "coiffeur à Ducos (Martinique).",
  robots: { index: false, follow: true },
};

export default function InscriptionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
