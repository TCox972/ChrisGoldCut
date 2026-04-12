import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import ReservationForm from '@/components/public/ReservationForm';
import ContactInfo from '@/components/public/ContactInfo';

export default function ReservationPage() {
  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Réservation"
        backgroundImage="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80"
      />
      <ReservationForm />
      <ContactInfo />
      <Footer />
    </main>
  );
}
