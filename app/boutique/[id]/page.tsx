'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/cart-context';
import { ArrowLeft, Loader2, Minus, Plus, ShoppingCart, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Produit = {
  _id:               string;
  categorie:         string;
  nom:               string;
  description:       string;
  descriptionLongue: string;
  prix:              number;
  image:             string;
  images:            string[];
  stock:             number;
  actif:             boolean;
};

export default function ProduitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [produit, setProduit] = useState<Produit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [photoIdx, setPhotoIdx] = useState(0);

  const { addItem, items, updateQuantite } = useCart();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/produits/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Produit introuvable');
        return r.json();
      })
      .then((data: Produit) => setProduit(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const qty = produit ? (items.find(i => i.produitId === produit._id)?.quantite ?? 0) : 0;
  const allImages = produit
    ? (produit.images?.length ? produit.images : produit.image ? [produit.image] : [])
    : [];

  const toProduitCart = (p: Produit) => ({
    id: p._id, categorie: p.categorie, nom: p.nom,
    description: p.description, prix: p.prix, image: allImages[0] || '',
  });

  return (
    <main>
      <Navbar dark />

      <section className="pt-28 pb-16 px-6 bg-white min-h-screen">
        <div className="max-w-5xl mx-auto">

          {/* Retour */}
          <Link href="/boutique"
            className="inline-flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
            <ArrowLeft size={16} /> Retour à la boutique
          </Link>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-body text-sm">Chargement...</span>
            </div>
          ) : error || !produit ? (
            <div className="text-center py-24">
              <p className="font-body text-red-500 text-sm mb-4">{error || 'Produit introuvable.'}</p>
              <Link href="/boutique" className="btn-gold-outline text-xs px-6 py-2">
                Retour à la boutique
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

              {/* ── Galerie photos ── */}
              <div>
                {allImages.length > 0 ? (
                  <div className="relative">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={allImages[photoIdx]}
                        alt={produit.nom}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Flèches */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIdx(i => (i - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 shadow
                            flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setPhotoIdx(i => (i + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 shadow
                            flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                    {/* Miniatures */}
                    {allImages.length > 1 && (
                      <div className="flex gap-2 mt-3">
                        {allImages.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setPhotoIdx(i)}
                            className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors
                              ${i === photoIdx ? 'border-yellow-400' : 'border-transparent hover:border-gray-300'}`}
                          >
                            <img src={url} alt={`${produit.nom} ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="font-body text-gray-300 text-sm">Aucune photo</span>
                  </div>
                )}
              </div>

              {/* ── Informations produit ── */}
              <div className="flex flex-col">
                {/* Catégorie */}
                <span className="font-display text-[10px] tracking-[0.3em] uppercase text-yellow-600 font-bold mb-2">
                  {produit.categorie}
                </span>

                {/* Nom */}
                <h1 className="font-body text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {produit.nom}
                </h1>

                {/* Infos courtes */}
                {produit.description && (
                  <p className="font-body text-sm text-gray-500 mb-4">{produit.description}</p>
                )}

                {/* Prix */}
                <p className="font-display text-2xl font-bold text-yellow-600 mb-6">
                  {produit.prix.toFixed(2)} €
                </p>

                {/* Stock */}
                {produit.stock === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                    <p className="font-body text-sm text-red-600 font-medium">Rupture de stock</p>
                  </div>
                ) : produit.stock <= 3 ? (
                  <p className="font-body text-sm text-red-500 font-medium mb-6">
                    Plus que {produit.stock} en stock !
                  </p>
                ) : (
                  <p className="font-body text-sm text-green-600 mb-6">En stock</p>
                )}

                {/* Bouton ajouter / quantité */}
                {produit.stock > 0 && (
                  <div className="mb-8">
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem(toProduitCart(produit))}
                        className="w-full md:w-auto flex items-center justify-center gap-3
                          bg-yellow-400 text-gray-900 font-body text-sm font-bold
                          px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
                      >
                        <ShoppingCart size={16} /> Ajouter au panier
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2">
                          <button onClick={() => updateQuantite(produit._id, qty - 1)}
                            className="text-gray-500 hover:text-red-500 transition-colors">
                            {qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                          </button>
                          <span className="font-body text-lg font-bold text-gray-900 w-8 text-center">{qty}</span>
                          <button onClick={() => addItem(toProduitCart(produit))}
                            className="text-gray-500 hover:text-yellow-600 transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                        <Link href="/panier"
                          className="font-body text-sm text-yellow-600 hover:text-yellow-700 font-medium underline underline-offset-2">
                          Voir le panier
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Description longue */}
                {produit.descriptionLongue && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-body text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                      Description
                    </h3>
                    <p className="font-body text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {produit.descriptionLongue}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
