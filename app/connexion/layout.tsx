import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
  description:
    "Connectez-vous à votre compte client Gold Cut pour gérer vos rendez-vous chez votre coiffeur à Ducos (Martinique).",
  robots: { index: false, follow: true },
};

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
