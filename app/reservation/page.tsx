import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import ReservationForm from '@/components/public/ReservationForm';
import ContactInfo from '@/components/public/ContactInfo';

export const metadata: Metadata = {
  title: 'Réserver un coiffeur en ligne — Ducos, Martinique',
  description:
    "Réservez votre rendez-vous chez Gold Cut, coiffeur homme à Ducos (Martinique). " +
    "Coupe, dégradé, soin barbe ou cheveux : choisissez votre prestation, votre date et " +
    "votre créneau en quelques clics.",
  alternates: { canonical: '/reservation' },
  openGraph: {
    title: 'Réserver — Gold Cut, Coiffeur Ducos Martinique',
    description: 'Prenez rendez-vous en ligne chez votre coiffeur à Ducos, Martinique.',
    url: '/reservation',
  },
};

export default function ReservationPage() {
  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Réservation"
        subtitle="Coiffeur Homme · Ducos · Martinique"
        srTitle="— Prendre rendez-vous chez votre coiffeur à Ducos, Martinique"
        backgroundImage="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80"
      />
      <ReservationForm />
      <ContactInfo />
      <Footer />
    </main>
  );
}
