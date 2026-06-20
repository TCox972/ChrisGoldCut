import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import Providers from '@/components/Providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://goldcut.fr';
const SITE_NAME = 'Gold Cut';
const TAGLINE = 'Coiffeur Homme à Ducos — Martinique';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s | ${SITE_NAME} — Coiffeur Ducos Martinique`,
  },
  description:
    "Gold Cut, salon de coiffure premium à Ducos (Martinique). Coupes homme, dégradés, " +
    "soins barbe et entretien des cheveux. Réservez votre rendez-vous en ligne avec Christopher, " +
    "votre coiffeur expert au cœur de la Martinique.",
  applicationName: SITE_NAME,
  authors: [{ name: 'Gold Cut Ducos' }],
  generator: 'Next.js',
  keywords: [
    'coiffeur Ducos',
    'coiffeur Martinique',
    'salon coiffure Ducos',
    'salon coiffure Martinique',
    'coupe homme Ducos',
    'coupe homme Martinique',
    'barbier Ducos',
    'barbier Martinique',
    'soin cheveux Martinique',
    'dégradé Ducos',
    'taille de barbe Martinique',
    'Gold Cut',
    'coiffeur 97224',
    'salon homme Ducos',
    'Christopher coiffeur Martinique',
  ],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'beauty',
  alternates: {
    canonical: '/',
    languages: { 'fr-FR': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description:
      "Salon de coiffure premium à Ducos en Martinique. Coupes, dégradés, soins barbe et cheveux. " +
      "Réservez en ligne avec Christopher.",
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Gold Cut — Salon de coiffure à Ducos, Martinique' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: 'Coiffeur Homme à Ducos, Martinique. Réservez en ligne.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    // À renseigner après création des comptes Search Console / Bing
    // google: 'xxxxxxxxxxxxxxxxxx',
    // other: { 'msvalidate.01': 'xxxxxxxxxxxxxxxxxx' },
  },
};

export const viewport: Viewport = {
  themeColor: '#D4A017',
  // L'admin est en thème clair et le site public gère lui-même ses sections
  // sombres via Tailwind. On force "light" pour éviter que le navigateur
  // applique son thème système (sombre) aux inputs sans couleur explicite.
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

// ─── JSON-LD : LocalBusiness / HairSalon ─────────────────────────────────────
const hairSalonJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  '@id': `${SITE_URL}#hairsalon`,
  name: SITE_NAME,
  alternateName: 'Gold Cut Ducos',
  description:
    'Salon de coiffure homme à Ducos (Martinique). Coupes, dégradés, soins barbe et entretien des cheveux. ' +
    'Réservation de rendez-vous en ligne.',
  url: SITE_URL,
  telephone: '+596696102030',
  email: 'info@goldcut.com',
  image: `${SITE_URL}/og-image.jpg`,
  logo: `${SITE_URL}/og-image.jpg`,
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Espèces, Carte bancaire',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Impasse de la Sablière, Bourg',
    postalCode: '97224',
    addressLocality: 'Ducos',
    addressRegion: 'Martinique',
    addressCountry: 'FR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 14.5897,
    longitude: -60.9572,
  },
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Martinique' },
    { '@type': 'City', name: 'Ducos' },
    { '@type': 'City', name: 'Fort-de-France' },
    { '@type': 'City', name: 'Le Lamentin' },
    { '@type': 'City', name: 'Saint-Esprit' },
    { '@type': 'City', name: 'Rivière-Salée' },
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
  sameAs: [
    'https://www.instagram.com/gold_cut777',
  ],
  makesOffer: [
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Coupe homme' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Dégradé' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Taille de barbe' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Soin cheveux' } },
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: 'fr-FR',
  potentialAction: {
    '@type': 'ReserveAction',
    target: `${SITE_URL}/reservation`,
    name: 'Réserver un rendez-vous',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700&family=Dancing+Script:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hairSalonJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <Providers>
          <CartProvider>
            {children}
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
