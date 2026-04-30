'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
<<<<<<< HEAD
=======
import SectionTitle from '@/components/ui/SectionTitle';
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
import ReservationForm from '@/components/public/ReservationForm';
import { Loader2 } from 'lucide-react';

type Prestation = {
  _id:       string;
<<<<<<< HEAD
  categorie: string;
=======
  categorie: 'Coupes' | 'Dégradés' | 'Barbe' | 'Soins';
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  nom:       string;
  duree:     string;
  prix:      number;
};

<<<<<<< HEAD
export default function PrestationsPage() {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [catOrder,    setCatOrder]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // ─── Chargement depuis l'API ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/prestations').then(r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      }),
      fetch('/api/category-order?type=prestations').then(r => r.json()).catch(() => ({ order: [] })),
    ])
      .then(([data, orderData]) => {
        setPrestations(Array.isArray(data) ? data : []);
        setCatOrder(Array.isArray(orderData?.order) ? orderData.order : []);
=======
type GroupedPrestations = Record<string, Prestation[]>;

const CATEGORIES = ['Coupes', 'Dégradés', 'Barbe', 'Soins'] as const;

export default function PrestationsPage() {
  const [grouped, setGrouped] = useState<GroupedPrestations>({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ─── Chargement depuis l'API ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/prestations')
      .then(r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data: Prestation[]) => {
        // Groupe par catégorie en respectant l'ordre défini
        const g: GroupedPrestations = {};
        CATEGORIES.forEach(cat => {
          g[cat] = data.filter(p => p.categorie === cat);
        });
        setGrouped(g);
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

<<<<<<< HEAD
  // Catégories triées selon l'ordre défini par l'admin
  const allCats = Array.from(new Set(prestations.map(p => p.categorie).filter(Boolean)));
  const categories = [
    ...catOrder.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !catOrder.includes(c)),
  ];

=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Nos Prestations"
        backgroundImage="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80"
      />

      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-body text-sm">Chargement des prestations...</span>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <p className="font-body text-red-500 text-sm">{error}</p>
            </div>
          ) : (
            <div
              className="border rounded-sm p-8 md:p-12"
              style={{ borderColor: 'rgba(212,160,23,0.4)', backgroundColor: '#111111' }}
            >
<<<<<<< HEAD
              {categories.map((cat, ci) => {
                const items = prestations.filter(p => p.categorie === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className={ci < categories.length - 1 ? 'mb-12' : ''}>
=======
              {CATEGORIES.map((cat, ci) => {
                const items = grouped[cat] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={cat} className={ci < CATEGORIES.length - 1 ? 'mb-12' : ''}>
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
                    {/* En-tête de catégorie */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                      <span className="text-yellow-400 text-xs">★</span>
                      <h2 className="font-display text-lg tracking-[0.3em] uppercase text-yellow-400 font-bold">
                        {cat}
                      </h2>
                      <span className="text-yellow-400 text-xs">★</span>
                    </div>

                    {/* Grille des prestations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4">
                      {items.map(p => (
                        <div
                          key={p._id}
                          className="flex items-end justify-between border-b border-white/10 pb-3"
                        >
                          <div>
                            <p className="font-body text-sm text-white/90">{p.nom}</p>
                            <p className="font-body text-xs text-white/40 mt-0.5">{p.duree}</p>
                          </div>
                          <span className="font-display text-sm font-bold text-yellow-400 ml-4 flex-shrink-0">
                            {p.prix} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* CTA */}
              <div className="flex justify-center mt-10">
                <a href="/reservation" className="btn-gold flex items-center gap-3">
                  <span>↓</span> Réserver Votre Place Maintenant <span>↓</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <ReservationForm />
      <Footer />
    </main>
  );
}
