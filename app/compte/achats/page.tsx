'use client';

import { useState, useEffect, useMemo } from 'react';
import CompteNav from '@/components/public/CompteNav';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Loader2, X, Plus, Minus, ShoppingBag } from 'lucide-react';

type Article = {
  produitId:   string;
  nom:         string;
  description: string;
  image:       string;
  prix:        number;
  quantite:    number;
  livre?:      boolean;
};

type Commande = {
  _id:         string;
  numero:      string;
  articles:    Article[];
  sousTotal:   number;
  remise:      number;
  total:       number;
  statut:      'en-attente' | 'annulee';
  createdAt:   string;
};

export default function MesAchatsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editId,    setEditId]    = useState<string | null>(null);
  // On stocke les quantités en cours de modification par commande
  const [draftQty,  setDraftQty]  = useState<Record<string, number>>({});
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState<'en-cours' | 'passees'>('en-cours');

  // ─── Chargement des commandes (attend que la session soit prête) ───────────
  // On masque uniquement les commandes annulées. Les commandes entièrement
  // livrées sont conservées pour l'onglet "Passées".
  useEffect(() => {
    if (authLoading || !user) return;
    fetch('/api/commandes')
      .then(r => r.json())
      .then((d: Commande[]) => {
        if (!Array.isArray(d)) { setCommandes([]); return; }
        setCommandes(d.filter(c => c.statut !== 'annulee'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, user?.id]);

  // ─── Séparation en cours / passées ────────────────────────────────────────
  // En cours : au moins un article non livré
  // Passées  : tous les articles livrés
  const { enCours, passees } = useMemo(() => {
    const enCours: Commande[] = [];
    const passees: Commande[] = [];
    for (const c of commandes) {
      const hasNonLivre = c.articles.some(a => !a.livre);
      if (hasNonLivre) enCours.push(c);
      else              passees.push(c);
    }
    return { enCours, passees };
  }, [commandes]);

  const visibles = tab === 'en-cours' ? enCours : passees;

  const [confirmId, setConfirmId] = useState<string | null>(null);

  // ─── Suppression après confirmation ───────────────────────────────────────
  const supprimer = async (id: string) => {
    const res = await fetch(`/api/commandes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCommandes(prev => prev.filter(c => c._id !== id));
    }
    setConfirmId(null);
  };

  // ─── Démarrer l'édition des quantités ────────────────────────────────────
  const startEdit = (commande: Commande) => {
    setEditId(commande._id);
    const qty: Record<string, number> = {};
    commande.articles.forEach(a => { qty[a.produitId] = a.quantite; });
    setDraftQty(qty);
  };

  const cancelEdit = () => { setEditId(null); setDraftQty({}); };

  // ─── Sauvegarder les nouvelles quantités ─────────────────────────────────
  const saveEdit = async (commande: Commande) => {
    setSaving(true);
    const articles = commande.articles.map(a => ({
      produitId: a.produitId,
      quantite:  draftQty[a.produitId] ?? a.quantite,
    }));

    const res = await fetch(`/api/commandes/${commande._id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ articles }),
    });

    if (res.ok) {
      const updated = await res.json();
      setCommandes(prev => prev.map(c => c._id === commande._id ? updated : c));
      setEditId(null);
    }
    setSaving(false);
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const statutLabel = (cmd: Commande) => {
    const hasNonLivre = cmd.articles.some(a => !a.livre);
    if (!hasNonLivre) return { label: 'Livrée',     cls: 'bg-green-50 text-green-700 border-green-200' };
    if (cmd.statut === 'en-attente') return { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { label: cmd.statut, cls: 'bg-gray-100 text-gray-500' };
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <CompteNav />
        <div className="flex items-center gap-2 text-white/60 py-16">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      </div>
    );
  }

  return (
    <div>
      <CompteNav />
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] uppercase text-white mb-6">
        Mes achats
      </h1>

      {/* ── Onglets En cours / Passées ── */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('en-cours')}
          className={`font-display text-xs tracking-[0.15em] uppercase px-5 py-2 rounded border transition-colors ${
            tab === 'en-cours'
              ? 'bg-yellow-400 text-black border-yellow-400'
              : 'bg-transparent text-white/60 border-white/15 hover:text-white'
          }`}
        >
          En cours ({enCours.length})
        </button>
        <button
          onClick={() => setTab('passees')}
          className={`font-display text-xs tracking-[0.15em] uppercase px-5 py-2 rounded border transition-colors ${
            tab === 'passees'
              ? 'bg-yellow-400 text-black border-yellow-400'
              : 'bg-transparent text-white/60 border-white/15 hover:text-white'
          }`}
        >
          Passées ({passees.length})
        </button>
      </div>

      {visibles.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <ShoppingBag size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-body text-gray-400 text-sm mb-6">
            {tab === 'en-cours'
              ? "Aucune réservation d'achat en cours."
              : "Aucune commande passée pour le moment."}
          </p>
          <Link href="/boutique" className="btn-gold text-sm">
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {visibles.map(cmd => {
            const isEditing = editId === cmd._id;
            const { label, cls } = statutLabel(cmd);
            const isPassee = tab === 'passees';

            return (
              <div key={cmd._id} className="bg-white rounded-lg overflow-hidden">

                {/* ── En-tête commande ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-sm font-bold text-gray-900 tracking-wider">
                      {cmd.numero}
                    </span>
                    <span className={`font-body text-xs px-3 py-1 rounded-full border ${cls}`}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-body">
                    <span>Passé le {formatDate(cmd.createdAt)}</span>
                    <span>·</span>
                    <span className="font-semibold text-gray-700">{cmd.total.toFixed(2)} €</span>
                  </div>
                </div>

                {/* ── Liste des articles ── */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-[1fr_100px_120px] gap-4 pb-2 mb-2 border-b border-gray-50">
                    <span className="font-display text-xs tracking-wider uppercase text-gray-400">Produit</span>
                    <span className="font-display text-xs tracking-wider uppercase text-gray-400 text-center">Qté</span>
                    <span className="font-display text-xs tracking-wider uppercase text-gray-400 text-right">Sous-total</span>
                  </div>

                  {cmd.articles
                    .filter(a => isPassee ? true : !a.livre)
                    .map(a => {
                    const qty = isEditing ? (draftQty[a.produitId] ?? a.quantite) : a.quantite;
                    return (
                      <div key={a.produitId}
                        className="grid grid-cols-[1fr_100px_120px] gap-4 items-center py-3 border-b border-gray-50 last:border-0">

                        {/* Produit */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            {a.image && (
                              <div className="w-full h-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${a.image})` }} />
                            )}
                          </div>
                          <div>
                            <p className="font-body text-sm font-semibold text-gray-900">{a.nom}</p>
                            <p className="font-body text-xs text-gray-400">{a.description}</p>
                          </div>
                        </div>

                        {/* Quantité */}
                        <div className="flex justify-center">
                          {isEditing ? (
                            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                              <button
                                onClick={() => setDraftQty(q => ({
                                  ...q, [a.produitId]: Math.max(1, (q[a.produitId] ?? 1) - 1)
                                }))}
                                className="px-2 py-1 text-gray-400 hover:text-gray-800 text-sm"
                              ><Minus size={12} /></button>
                              <span className="px-3 py-1 font-body text-sm border-x border-gray-200 min-w-[32px] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => setDraftQty(q => ({
                                  ...q, [a.produitId]: (q[a.produitId] ?? 1) + 1
                                }))}
                                className="px-2 py-1 text-gray-400 hover:text-gray-800 text-sm"
                              ><Plus size={12} /></button>
                            </div>
                          ) : (
                            <span className="font-body text-sm text-gray-700">{qty}</span>
                          )}
                        </div>

                        {/* Sous-total */}
                        <p className="font-body text-sm font-bold text-gray-900 text-right">
                          {(a.prix * qty).toFixed(2)} €
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* ── Récapitulatif + actions ── */}
                <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Totaux */}
                  <div className="flex items-center gap-6 text-sm font-body text-gray-600">
                    <span>Sous-total : <strong>{cmd.sousTotal.toFixed(2)} €</strong></span>
                    {cmd.remise > 0 && (
                      <span className="text-green-600">Remise : -{cmd.remise.toFixed(2)} €</span>
                    )}
                    <span className="text-gray-900 font-bold">Total : {cmd.total.toFixed(2)} €</span>
                  </div>

                  {/* Boutons — uniquement pour les commandes en cours */}
                  {!isPassee && cmd.statut === 'en-attente' && (
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(cmd)}
                            disabled={saving}
                            className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-60"
                          >
                            {saving
                              ? <><Loader2 size={12} className="animate-spin" />Sauvegarde...</>
                              : 'Enregistrer'
                            }
                          </button>
                          <button onClick={cancelEdit}
                            className="btn-gold-outline text-xs px-4 py-2">
                            Annuler les modifs
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(cmd)}
                            className="btn-gold-outline text-xs px-4 py-2"
                          >
                            Modifier les quantités
                          </button>
                          <button
                            onClick={() => setConfirmId(cmd._id)}
                            className="font-body text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <X size={13} /> Annuler
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modale de confirmation */}
      {confirmId && (() => {
        const cmd = commandes.find(c => c._id === confirmId);
        if (!cmd) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
              <h2 className="font-display text-base font-bold tracking-[0.1em] uppercase text-gray-900 mb-4">
                Confirmer l'annulation
              </h2>
              <p className="font-body text-sm text-gray-600 mb-2">
                Souhaitez-vous vraiment annuler cette commande ?
              </p>
              <div className="font-body text-sm text-gray-500 bg-gray-50 rounded p-3 mb-6">
                <p><span className="font-semibold text-gray-700">Commande :</span> {cmd.numero}</p>
                <p className="mt-1"><span className="font-semibold text-gray-700">Articles :</span> {cmd.articles.map(a => a.nom).join(', ')}</p>
                <p className="mt-1"><span className="font-semibold text-gray-700">Total :</span> {cmd.total.toFixed(2)} €</p>
              </div>
              <p className="font-body text-xs text-red-400 mb-6">
                Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmId(null)}
                  className="btn-gold-outline text-xs px-5 py-2">
                  Retour
                </button>
                <button onClick={() => supprimer(cmd._id)}
                  className="font-display text-xs tracking-[0.15em] uppercase px-5 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
