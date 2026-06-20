import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SectionTitle from '@/components/ui/SectionTitle';
import ReservationForm from '@/components/public/ReservationForm';
import ContactInfo from '@/components/public/ContactInfo';
import HomeInfoBar from '@/components/public/HomeInfoBar';
import Link from 'next/link';
import { Scissors, Droplets, Zap } from 'lucide-react';

const prestationsHome = [
  { icon: Scissors, titre: 'Coupes', desc: 'Coupes et contours, barbe. Shampoing et massage' },
  { icon: Droplets,  titre: 'Soins',  desc: 'Coupes et contours, barbe. Shampoing et massage' },
  { icon: Zap,       titre: 'Barbe',  desc: 'Coupes et contours, barbe. Shampoing et massage' },
];

const photos = [
  'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400&q=80',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80',
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80',
];

const marques = ['Uncle Jimmy', 'OKAY MEN', 'Reuzel Professional'];

export default function HomePage() {
  return (
    <main>
      <Navbar dark />

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80)' }} />
          <div className="absolute inset-0 hero-overlay" />
        </div>

        <div className="relative z-10 text-center flex flex-col items-center gap-6 px-6">
          <div className="animate-fade-up">
            <p className="font-display text-xl md:text-2xl tracking-[0.4em] uppercase text-yellow-400">CHRISTOPHER</p>
            <h1 className="font-display text-5xl md:text-7xl font-black tracking-[0.15em] uppercase text-white leading-none">
              GOLD CUT
              <span className="sr-only"> — Salon de coiffure mixte à Ducos, Martinique</span>
            </h1>
          </div>
          <Link href="/reservation" className="btn-gold animate-fade-up delay-300 opacity-0-init">
            Réservez votre place
          </Link>
        </div>

        {/* Info bar (icônes cliquables sur mobile, texte sur desktop) */}
        <HomeInfoBar />
      </section>

      {/* ─── Nos Prestations ─────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="max-w-5xl mx-auto">
          <SectionTitle dark className="mb-14">Nos Prestations</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {prestationsHome.map((p, i) => (
              <div key={i} className="card-gold p-8 flex flex-col items-center gap-5 text-center"
                style={{ borderColor: 'rgba(212,160,23,0.4)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-yellow-400">
                  <p.icon size={36} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, #D4A017)' }} />
                    <h3 className="font-display text-sm tracking-[0.3em] uppercase text-yellow-400 font-bold">{p.titre}</h3>
                    <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, #D4A017, transparent)' }} />
                  </div>
                  <p className="font-body text-sm text-white/60 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ──────────────────────────────────────────────── */}
      <section className="py-0 overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="grid grid-cols-4 md:grid-cols-8 h-48 md:h-56">
          {photos.map((src, i) => (
            <div key={i} className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${src})` }} />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Notre Salon ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <SectionTitle className="mb-8">Notre Salon</SectionTitle>
          <p className="font-display text-lg md:text-xl font-medium text-gray-800 mb-6 leading-relaxed">
            Plus qu'un simple salon, un lieu où l'on prend soin de votre visage.
          </p>
          <p className="font-body text-sm text-gray-500 leading-loose mb-4">
            Nous choisissons nos élixirs et nos shampoings avec minutie.
          </p>
          <p className="font-body text-sm text-gray-500 leading-loose mb-4">
            Nous faisons de votre bien-être une priorité. Nos soins sont adaptés à chaque type de cheveux.
          </p>
          <p className="font-body text-sm text-gray-500 leading-loose mb-12">
            Dans notre salon, vous serez pris en charge et sublimé.
          </p>

          {/* Marques — colonne, mises en avant (mobile + desktop) */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, #D4A017)' }} />
            <span className="text-yellow-500 text-base">★</span>
            <p className="font-display text-sm tracking-[0.3em] uppercase text-gray-700 font-bold">Nos marques</p>
            <span className="text-yellow-500 text-base">★</span>
            <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, #D4A017, transparent)' }} />
          </div>
          <div className="flex flex-col items-center gap-4 mt-8 max-w-md mx-auto">
            {marques.map((m, i) => (
              <div
                key={i}
                className="w-full font-display font-black text-lg md:text-2xl tracking-[0.25em] uppercase text-gray-800
                  border-2 px-8 py-6 rounded text-center bg-gradient-to-b from-white to-yellow-50/30
                  shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                style={{ borderColor: '#D4A017' }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Reservation Form ─────────────────────────────────────────────── */}
      <ReservationForm />

      {/* ─── Contact & Horaires ───────────────────────────────────────────── */}
      <ContactInfo />

      <Footer />
    </main>
  );
}
