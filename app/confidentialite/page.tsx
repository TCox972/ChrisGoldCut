import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';

export const metadata: Metadata = {
  title: 'Politique de confidentialité & cookies',
  description:
    "Politique de confidentialité et d'utilisation des cookies du site Gold Cut, " +
    'salon de coiffure mixte à Ducos (Martinique).',
  alternates: { canonical: '/confidentialite' },
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Confidentialité"
        srTitle="— Politique de confidentialité et cookies de Gold Cut"
        backgroundImage="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80"
      />

      <section className="py-16 sm:py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto font-body text-gray-700 leading-relaxed space-y-10">

          <div>
            <h2 className="font-display text-xl uppercase tracking-wider text-gray-900 mb-3">
              Cookies
            </h2>
            <p className="text-sm">
              Un cookie est un petit fichier déposé sur votre appareil lors de la visite d'un site.
              Le site Gold Cut utilise uniquement des cookies et un stockage local
              <strong> strictement nécessaires</strong> à son bon fonctionnement :
            </p>
            <ul className="list-disc pl-5 mt-3 text-sm space-y-1.5">
              <li>mémorisation de votre session lorsque vous êtes connecté à votre compte ;</li>
              <li>conservation du contenu de votre panier ;</li>
              <li>mémorisation de votre choix concernant ce bandeau de consentement.</li>
            </ul>
            <p className="text-sm mt-3">
              Nous n'utilisons pas de cookies publicitaires ni de traceurs tiers à des fins de
              profilage. Lors de votre première visite, vous pouvez accepter ou refuser via le
              bandeau prévu à cet effet. Vous pouvez à tout moment supprimer les cookies depuis
              les réglages de votre navigateur.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl uppercase tracking-wider text-gray-900 mb-3">
              Données personnelles
            </h2>
            <p className="text-sm">
              Les informations que vous renseignez (nom, e-mail, téléphone) sont utilisées
              exclusivement pour la gestion de vos rendez-vous et commandes, ainsi que pour
              vous contacter à ce sujet. Elles ne sont ni vendues ni cédées à des tiers.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl uppercase tracking-wider text-gray-900 mb-3">
              Vos droits
            </h2>
            <p className="text-sm">
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de
              suppression de vos données. Pour toute demande, contactez-nous par e-mail à{' '}
              <a href="mailto:info@goldcut.com" className="underline" style={{ color: '#D4A017' }}>
                info@goldcut.com
              </a>{' '}
              ou par téléphone au +596 (0)696 10 20 30.
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
