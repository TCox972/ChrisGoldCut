import type { Metadata } from 'next';
import { connectDB } from '@/lib/mongodb';
import Produit from '@/models/Produit';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    await connectDB();
    const p = await Produit.findOne({ _id: params.id, actif: true })
      .select('nom description descriptionLongue prix image images categorie')
      .lean();

    if (!p) {
      return {
        title: 'Produit introuvable',
        robots: { index: false, follow: true },
      };
    }

    const longue = (p.descriptionLongue || '').trim();
    const courte = (p.description || '').trim();
    const desc =
      (longue || courte || `${p.nom} — produit ${p.categorie || 'capillaire'} disponible chez Gold Cut, votre coiffeur à Ducos (Martinique).`)
        .slice(0, 200);

    const image = p.images?.[0] || p.image || undefined;

    return {
      title: `${p.nom} — ${p.categorie || 'Boutique'}`,
      description: desc,
      alternates: { canonical: `/boutique/${params.id}` },
      openGraph: {
        title: `${p.nom} — Gold Cut, Coiffeur Ducos Martinique`,
        description: desc,
        url: `/boutique/${params.id}`,
        images: image ? [{ url: image }] : undefined,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Produit' };
  }
}

export default function ProduitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
