'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import SectionTitle from '@/components/ui/SectionTitle';
import { useCart } from '@/lib/cart-context';
import { X, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type Step = 'cart' | 'info' | 'success';

export default function PanierPage() {
  const { data: session } = useSession();
  const {
    items, removeItem, updateQuantite,
    totalItems, totalPrix, remise, totalFinal, clearCart,
  } = useCart();

  const [step,    setStep]    = useState<Step>('cart');
  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState('');

  // Infos client (pré-rempli si connecté)
  const [info, setInfo] = useState({
    nom:   (session?.user as any)?.prenom ?? '',
    email: session?.user?.email ?? '',
  });

  // ─── Validation du panier → POST /api/commandes ───────────────────────────
  const valider = async () => {
    if (!info.nom || !info.email) {
      setErrMsg('Veuillez renseigner votre prénom et votre email.');
      return;
    }
    setLoading(true);
    setErrMsg('');

    try {
      const res = await fetch('/api/commandes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          clientNom:   info.nom,
          clientEmail: info.email,
          articles:    items.map(i => ({
            produitId:   i.produitId,
            nom:         i.nom,
            description: i.description,
            image:       i.image,
            prix:        i.prix,
            quantite:    i.quantite,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrMsg(data.error ?? 'Une erreur est survenue.');
      } else {
        clearCart();
        setStep('success');
      }
    } catch {
      setErrMsg('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Écran succès ─────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <main>
        <Navbar dark />
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6 pt-24 pb-16">
          <CheckCircle size={56} className="text-yellow-500" strokeWidth={1.5} />
          <h2 className="font-display text-2xl tracking-widest uppercase text-gray-900">
            Réservation confirmée !
          </h2>
          <p className="font-body text-gray-500 text-sm max-w-sm leading-relaxed">
            Vos articles sont réservés. Récupérez-les lors de votre prochain passage au salon.<br />
            Un récapitulatif est disponible dans votre espace client.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Link href="/compte/achats" className="btn-gold">
              Voir mes achats
            </Link>
            <Link href="/boutique" className="btn-gold-outline">
              Continuer mes achats
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar dark />
      <PageHero
        title="Panier"
        backgroundImage="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1600&q=80"
      />

      <section className="py-16 px-6 bg-white min-h-screen">
        <div className="max-w-5xl mx-auto">
          <SectionTitle className="mb-6">Vos Achats</SectionTitle>

          <p className="font-body text-sm text-gray-500 text-center mb-10">
            Validez votre panier ici. Nous réservons vos articles.<br />
            <span className="font-medium text-gray-700">Payez et récupérez-les au salon.</span>
          </p>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-body text-gray-400 text-sm mb-6">Votre panier est vide.</p>
              <Link href="/boutique" className="btn-gold">Découvrir la boutique</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

              {/* ── Liste des articles ── */}
              <div>
                {/* En-têtes */}
                <div className="grid grid-cols-[1fr_110px_130px_32px] gap-4 pb-3 border-b border-gray-200 mb-2">
                  {['Produits', 'Qté', 'Sous-total', ''].map(h => (
                    <span key={h} className="font-display text-xs tracking-[0.2em] uppercase text-gray-500">{h}</span>
                  ))}
                </div>

                {items.map(item => (
                  <div
                    key={item.produitId}
                    className="grid grid-cols-[1fr_110px_130px_32px] gap-4 items-center py-4 border-b border-gray-100"
                  >
                    {/* Produit */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                        {item.image && (
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-body text-sm font-semibold text-gray-900">{item.nom}</p>
                        <p className="font-body text-xs text-gray-400">{item.description}</p>
                        <p className="font-body text-xs text-yellow-600 font-medium mt-0.5">{item.prix.toFixed(2)} € / unité</p>
                      </div>
                    </div>

                    {/* Quantité */}
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden w-fit">
                      <button
                        onClick={() => updateQuantite(item.produitId, item.quantite - 1)}
                        className="px-2 py-1 text-gray-400 hover:text-gray-800 transition-colors text-sm"
                      >−</button>
                      <span className="px-3 py-1 font-body text-sm border-x border-gray-200 min-w-[32px] text-center">
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantite(item.produitId, item.quantite + 1)}
                        className="px-2 py-1 text-gray-400 hover:text-gray-800 transition-colors text-sm"
                      >+</button>
                    </div>

                    {/* Sous-total */}
                    <p className="font-body text-sm font-bold text-gray-900">
                      {(item.prix * item.quantite).toFixed(2)} €
                    </p>

                    {/* Supprimer */}
                    <button
                      onClick={() => removeItem(item.produitId)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <Link
                  href="/boutique"
                  className="inline-flex items-center gap-2 mt-6 font-body text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft size={16} /> Continuer mes achats
                </Link>
              </div>

              {/* ── Résumé + validation ── */}
              <div className="flex flex-col gap-4">

                {/* Récapitulatif */}
                <div className="border rounded p-6" style={{ borderColor: 'rgba(212,160,23,0.3)' }}>
                  <h3 className="font-display text-sm tracking-[0.2em] uppercase text-gray-900 font-bold mb-4 pb-3 border-b border-gray-100">
                    Résumé
                  </h3>
                  <div className="flex flex-col gap-2.5 text-sm font-body">
                    <div className="flex justify-between text-gray-600">
                      <span>Articles</span>
                      <span className="font-medium">{totalItems} article{totalItems > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Sous-total</span>
                      <span className="font-medium">{totalPrix.toFixed(2)} €</span>
                    </div>
                    {remise > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Remise fidélité</span>
                        <span className="font-medium">-{remise.toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-100 text-base">
                      <span>Total</span>
                      <span>{totalFinal.toFixed(2)} €</span>
                    </div>
                  </div>

                  {totalItems < 4 && (
                    <p className="text-xs text-gray-400 font-body mt-3">
                      💡 À partir de 4 articles, bénéficiez de -10€ de remise.
                    </p>
                  )}
                </div>

                {/* Infos client si non connecté */}
                {!session?.user && (
                  <div className="border rounded p-5 flex flex-col gap-3" style={{ borderColor: 'rgba(212,160,23,0.2)' }}>
                    <p className="font-body text-xs text-gray-500">
                      Renseignez vos coordonnées pour valider votre réservation :
                    </p>
                    <input
                      value={info.nom}
                      onChange={e => setInfo(i => ({ ...i, nom: e.target.value }))}
                      placeholder="Prénom *"
                      className="input-gold text-gray-800"
                    />
                    <input
                      type="email"
                      value={info.email}
                      onChange={e => setInfo(i => ({ ...i, email: e.target.value }))}
                      placeholder="Email *"
                      className="input-gold text-gray-800"
                    />
                  </div>
                )}

                {session?.user && (
                  <p className="font-body text-xs text-gray-400 text-center">
                    Connecté en tant que <span className="text-gray-700 font-medium">{session.user.email}</span>
                  </p>
                )}

                {errMsg && (
                  <p className="text-red-500 text-xs font-body bg-red-50 rounded px-3 py-2">{errMsg}</p>
                )}

                <button
                  onClick={valider}
                  disabled={loading || items.length === 0}
                  className="btn-gold w-full disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Réservation en cours...</>
                    : 'Valider ma réservation'
                  }
                </button>

                <p className="font-body text-xs text-gray-400 text-center">
                  Aucun paiement en ligne. Vous payez et récupérez vos articles au salon.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
