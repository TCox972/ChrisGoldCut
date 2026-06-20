'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import SectionTitle from '@/components/ui/SectionTitle';
import { useCart } from '@/lib/cart-context';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

type Produit = {
  _id:         string;
  categorie:   string;
  nom:         string;
  description: string;
  prix:        number;
  image:       string;
  actif:       boolean;
};

// Adaptateur : les items du panier utilisent produitId, on mappe _id → id pour useCart
function toProduitCart(p: Produit) {
  return { id: p._id, categorie: p.categorie, nom: p.nom, description: p.description, prix: p.prix, image: p.image };
}

export default function BoutiquePage() {
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [catOrder,    setCatOrder]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [active,      setActive]      = useState<string>('');

  const { addItem, items, updateQuantite, totalItems, totalPrix } = useCart();

  const [reloadTick, setReloadTick] = useState(0);

  // ─── Chargement depuis l'API (une seule fois, filtrage client-side) ─────────
  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch('/api/produits').then(r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      }),
      fetch('/api/category-order?type=produits').then(r => r.json()).catch(() => ({ order: [] })),
    ])
      .then(([data, orderData]) => {
        setAllProduits(Array.isArray(data) ? data : []);
        setCatOrder(Array.isArray(orderData?.order) ? orderData.order : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [reloadTick]);

  // Catégories dynamiques : "Tout" en tête + catégories ordonnées par l'admin
  const allCats = Array.from(new Set(allProduits.map(p => p.categorie).filter(Boolean)));
  const categories: string[] = [
    'Tout',
    ...catOrder.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !catOrder.includes(c)),
  ];

  // Sélection par défaut : "Tout" (premier onglet)
  useEffect(() => {
    if (!active && categories.length > 0) setActive(categories[0]);
  }, [active, categories]);

  const produits = active === 'Tout' || !active
    ? allProduits
    : allProduits.filter(p => p.categorie === active);

  const getQty = (id: string) => items.find(i => i.produitId === id)?.quantite ?? 0;

  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Notre Boutique"
        srTitle="— Produits soin barbe et cheveux du salon Gold Cut à Ducos, Martinique"
        backgroundImage="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1600&q=80"
      />

      <section className="py-16 px-6 bg-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          <SectionTitle className="mb-10">Nos Produits</SectionTitle>

          {/* ── Sélecteur catégorie : menu déroulant sur mobile ── */}
          <div className="md:hidden mb-8">
            <label htmlFor="cat-select" className="sr-only">Catégorie</label>
            <div className="relative">
              <select
                id="cat-select"
                value={active}
                onChange={e => setActive(e.target.value)}
                className="w-full appearance-none bg-white border-2 rounded-lg px-4 py-3 pr-10
                  font-display text-sm tracking-[0.2em] uppercase font-bold text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-yellow-400/40 transition-colors"
                style={{ borderColor: '#D4A017' }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-600 pointer-events-none"
              />
            </div>
          </div>

          {/* ── Onglets catégories : visibles uniquement à partir de md ── */}
          <div className="hidden md:flex border-b border-gray-200 mb-8">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`flex-1 py-3 font-display text-xs tracking-[0.2em] uppercase transition-colors duration-200
                  ${active === c ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Barre résumé panier */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between border rounded px-5 py-3 mb-8"
              style={{ borderColor: 'rgba(212,160,23,0.5)' }}>
              <span className="font-body text-sm text-gray-700 flex items-center gap-2">
                <ShoppingCart size={15} className="text-yellow-500" />
                <span className="font-semibold">{totalItems} article{totalItems > 1 ? 's' : ''}</span>
                {' — '}
                <span className="font-bold text-gray-900">{totalPrix.toFixed(2)} €</span>
              </span>
              <Link href="/panier" className="btn-gold text-xs px-5 py-2">
                Voir le panier
              </Link>
            </div>
          )}

          {/* États : chargement / erreur / vide / grille */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-body text-sm">Chargement des produits...</span>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <p className="font-body text-red-500 text-sm mb-4">{error}</p>
              <button onClick={() => setReloadTick(t => t + 1)} className="btn-gold-outline text-xs px-6 py-2">
                Réessayer
              </button>
            </div>
          ) : produits.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-body text-gray-400 text-sm">Aucun produit dans cette catégorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {produits.map(p => {
                const qty = getQty(p._id);
                return (
                  <div key={p._id} className="relative rounded overflow-hidden group bg-gray-900">
                    {/* Image — cliquable vers la fiche produit */}
                    <div className="relative h-52 overflow-hidden">
                      <Link href={`/boutique/${p._id}`}
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${p.image || 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80'})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent pointer-events-none" />

                      {/* Nom + prix + bouton */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <Link href={`/boutique/${p._id}`} className="font-body text-sm font-semibold text-white hover:text-yellow-300 transition-colors">
                            {p.nom}
                          </Link>
                          <p className="font-body text-xs text-white/60 mt-0.5">{p.description}</p>
                          <p className="font-body text-xs text-yellow-400 font-bold mt-1">{p.prix.toFixed(2)} €</p>
                        </div>

                        {qty === 0 ? (
                          <button
                            onClick={() => addItem(toProduitCart(p))}
                            className="bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded font-display tracking-wider hover:bg-yellow-300 transition-colors flex-shrink-0"
                          >
                            Ajouter
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 flex-shrink-0">
                            <button
                              onClick={() => updateQuantite(p._id, qty - 1)}
                              className="text-yellow-400 hover:text-white transition-colors"
                            >
                              {qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                            </button>
                            <span className="text-white text-xs font-bold w-4 text-center">{qty}</span>
                            <button
                              onClick={() => addItem(toProduitCart(p))}
                              className="text-yellow-400 hover:text-white transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
