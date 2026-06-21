import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://goldcut.fr';

type Route = MetadataRoute.Sitemap[number];

// Pages statiques publiques (l'espace admin et l'API sont exclus via robots.ts)
const staticRoutes: Route[] = [
  { url: `${SITE_URL}/`,             changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${SITE_URL}/prestations`,  changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${SITE_URL}/reservation`,  changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${SITE_URL}/boutique`,     changeFrequency: 'weekly',  priority: 0.8 },
  { url: `${SITE_URL}/le-salon`,     changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/a-propos`,     changeFrequency: 'yearly',  priority: 0.5 },
  { url: `${SITE_URL}/contact`,      changeFrequency: 'yearly',  priority: 0.7 },
  { url: `${SITE_URL}/connexion`,    changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${SITE_URL}/inscription`,  changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${SITE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticWithDate = staticRoutes.map(r => ({ ...r, lastModified: now }));

  // Pages produits dynamiques (boutique)
  let produitRoutes: Route[] = [];
  try {
    await connectDB();
    const produits = await Produit.find({ actif: true })
      .select('_id updatedAt')
      .lean();
    produitRoutes = produits.map(p => ({
      url: `${SITE_URL}/boutique/${p._id}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // Build sans BDD : on retourne uniquement les routes statiques
  }

  return [...staticWithDate, ...produitRoutes];
}
