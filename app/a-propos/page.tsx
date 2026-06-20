import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import SectionTitle from '@/components/ui/SectionTitle';
import ContactInfo from '@/components/public/ContactInfo';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'À propos — Coiffeur Gold Cut à Ducos, Martinique',
  description:
    "Découvrez l'histoire de Gold Cut, salon de coiffure homme à Ducos (Martinique) " +
    "et l'expertise de Christopher : coupes, dégradés, barbe et soins capillaires.",
  alternates: { canonical: '/a-propos' },
};

export default function AProposPage() {
  return (
    <main>
      <Navbar dark />
      <PageHero title="A Propos" backgroundImage="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80" />

      {/* Notre Salon */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <SectionTitle className="mb-10">Notre Salon</SectionTitle>
          <p className="font-body text-base text-gray-600 leading-loose">
            Bienvenue dans notre salon, un espace pensé exclusivement pour l'homme moderne. Ici, la coiffure ne se limite
            pas à une coupe, mais devient une véritable expérience de soin et de style. Nous mettons un point d'honneur à
            valoriser chaque client, en offrant un service personnalisé et des conseils adaptés. Notre expertise ne s'arrête
            pas aux cheveux : soins de la barbe, du visage et rituels bien-être font partie intégrante de notre philosophie.
            Nous croyons que prendre soin de soi est essentiel pour refléter confiance et élégance au quotidien. Chaque geste
            est pensé pour allier confort, précision et authenticité. Pour prolonger l'expérience à la maison, nous
            sélectionnons des produits haut de gamme, efficaces et respectueux. Notre mission : révéler la meilleure version
            de vous-même. Plus qu'un salon, un lieu où style et soin se rencontrent.
          </p>
        </div>
      </section>

      {/* Notre Histoire */}
      <section className="py-20 px-6" style={{ backgroundColor: '#111111' }}>
        <div className="max-w-2xl mx-auto text-center">
          <SectionTitle dark className="mb-10">Notre Histoire</SectionTitle>
          <p className="font-body text-base text-white/70 leading-loose">
            Le salon est né de la passion et de l'expérience de Christopher, coiffeur depuis plus de huit ans. Après avoir
            perfectionné son savoir-faire dans différents établissements, il a choisi de franchir une nouvelle étape : créer
            son propre espace, à son image. Son ambition était claire : offrir bien plus qu'une simple coupe, mais une
            expérience complète, centrée sur le confort et l'élégance masculine. Christopher a toujours cru que le métier
            de coiffeur allait au-delà des ciseaux, qu'il s'agissait aussi d'écoute, de conseil et de confiance. En fondant
            ce salon, il a voulu rassembler toutes ses valeurs pour proposer un lieu unique où l'homme peut se détendre,
            prendre soin de lui et repartir avec un style affirmé. Chaque détail a été pensé pour allier expertise, modernité
            et authenticité. Aujourd'hui, son salon est le reflet de son parcours, de son exigence et de sa passion pour ce
            métier.
          </p>
          <div className="mt-12">
            <Link href="/reservation" className="btn-gold">Réserver Maintenant</Link>
          </div>
        </div>
      </section>

      <ContactInfo />
      <Footer />
    </main>
  );
}
