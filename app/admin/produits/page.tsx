'use client';

import { useState, useEffect } from 'react';
import { Edit3, Trash2, Plus, Check, X, Loader2, Ban } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Produit = {
  _id: string; categorie: 'Barbe' | 'Cheveux' | 'Accessoires';
  nom: string; description: string; prix: number; stock: number; actif: boolean;
};
type Draft = Omit<Produit, '_id' | 'actif'>;

type CommandeAdmin = {
  _id: string; numero: string; clientNom: string; clientEmail: string;
  articles: { nom: string; quantite: number; prix: number; livre?: boolean }[];
  total: number; statut: 'en-attente' | 'annulee'; createdAt: string;
};

const CATEGORIES = ['Barbe', 'Cheveux', 'Accessoires'] as const;
const EMPTY: Draft = { categorie: 'Barbe', nom: '', description: '', prix: 0, stock: 0 };

export default function AdminProduitsPage() {
  const [tab,      setTab]      = useState<'liste' | 'achats'>('liste');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [commandes,setCommandes]= useState<CommandeAdmin[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingC, setLoadingC] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [draft,    setDraft]    = useState<Draft>(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [adding,   setAdding]   = useState(false);

  // ─── Chargement produits ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/produits?all=true')
      .then(r => r.json())
      .then(d => setProduits(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingP(false));
  }, []);

  // ─── Chargement commandes ─────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'achats') return;
    setLoadingC(true);
    fetch('/api/commandes')
      .then(r => r.json())
      .then(d => setCommandes(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingC(false));
  }, [tab]);

  const hDraft = (f: keyof Draft, v: string | number) =>
    setDraft(d => ({ ...d, [f]: v }));

  // ─── CRUD Produits ────────────────────────────────────────────────────────
  const startEdit = (p: Produit) => {
    setAdding(false);
    setEditId(p._id);
    setDraft({ categorie: p.categorie, nom: p.nom, description: p.description, prix: p.prix, stock: p.stock });
  };
  const cancelEdit = () => { setEditId(null); setAdding(false); };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/produits/${editId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    if (res.ok) {
      const u = await res.json();
      setProduits(prev => prev.map(p => p._id === editId ? u : p));
      setEditId(null);
    }
    setSaving(false);
  };

  const confirmAdd = async () => {
    if (!draft.nom.trim()) return;
    setSaving(true);
    const res = await fetch('/api/produits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    if (res.ok) {
      const created = await res.json();
      setProduits(prev => [...prev, created]);
      setAdding(false);
    }
    setSaving(false);
  };

  const supprimer = async (id: string) => {
    if (!confirm('Désactiver ce produit ?')) return;
    const res = await fetch(`/api/produits/${id}`, { method: 'DELETE' });
    if (res.ok) setProduits(prev => prev.filter(p => p._id !== id));
  };

  // ─── Annulation commande (admin) ──────────────────────────────────────────
  const annulerCommande = async (id: string) => {
    if (!confirm('Annuler cette réservation client ?')) return;
    const res = await fetch(`/api/commandes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'annulee' }),
    });
    if (res.ok) {
      setCommandes(prev => prev.map(c => c._id === id ? { ...c, statut: 'annulee' } : c));
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  // ─── Ligne d'édition réutilisable ─────────────────────────────────────────
  const EditableTr = ({ isNew = false }) => (
    <tr className={isNew ? 'bg-yellow-50' : 'bg-gray-50'}>
      <td className="px-5 py-3">
        <select value={draft.categorie} onChange={e => hDraft('categorie', e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-yellow-400 bg-white">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-5 py-3">
        <input value={draft.nom} onChange={e => hDraft('nom', e.target.value)}
          placeholder="Nom" autoFocus={isNew}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-yellow-400 w-36" />
      </td>
      <td className="px-5 py-3">
        <input value={draft.description} onChange={e => hDraft('description', e.target.value)}
          placeholder="60 ml"
          className="border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-yellow-400 w-24" />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1">
          <input type="number" min="0" step="0.5" value={draft.prix}
            onChange={e => hDraft('prix', parseFloat(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-yellow-400 w-16" />
          <span className="text-gray-400 text-xs">€</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <input type="number" min="0" value={draft.stock}
          onChange={e => hDraft('stock', parseInt(e.target.value))}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-yellow-400 w-16" />
      </td>
      <td className="px-5 py-3">
        <div className="flex gap-2">
          <button onClick={isNew ? confirmAdd : saveEdit}
            disabled={saving || !draft.nom.trim()}
            className="text-green-500 hover:text-green-700 disabled:opacity-40">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
          <button onClick={cancelEdit} className="text-gray-300 hover:text-gray-600"><X size={15} /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <h1 className="font-body text-2xl font-bold text-gray-900 mb-6">Produits</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

        {/* Onglets */}
        <div className="grid grid-cols-2 border-b border-gray-100">
          {(['liste', 'achats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-4 font-body text-sm font-medium transition-colors
                ${tab === t ? 'text-gray-900 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'liste' ? 'Liste des produits' : 'Réservations d\'achats clients'}
            </button>
          ))}
        </div>

        {/* ── Onglet liste produits ── */}
        {tab === 'liste' && (
          <>
            {loadingP ? (
              <div className="flex items-center gap-2 text-gray-400 py-12 px-6">
                <Loader2 size={18} className="animate-spin" /> Chargement...
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Catégorie','Désignation','Infos','Prix','Stock',''].map(h => (
                      <th key={h} className="font-body text-xs font-semibold text-gray-500 text-left px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {produits.map(p => {
                    if (editId === p._id) return <EditableTr key={p._id} />;
                    return (
                      <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${!p.actif ? 'opacity-40' : ''}`}>
                        <td className="px-5 py-3 font-body text-sm text-gray-600">{p.categorie}</td>
                        <td className="px-5 py-3 font-body text-sm text-gray-900">{p.nom}</td>
                        <td className="px-5 py-3 font-body text-sm text-gray-500">{p.description}</td>
                        <td className="px-5 py-3 font-body text-sm text-gray-600">{p.prix} €</td>
                        <td className="px-5 py-3">
                          <span className={`font-body text-sm font-medium ${p.stock <= 3 ? 'text-red-500' : 'text-gray-600'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(p)} className="text-gray-300 hover:text-yellow-500 transition-colors"><Edit3 size={15} /></button>
                            <button onClick={() => supprimer(p._id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {adding && <EditableTr isNew />}
                </tbody>
              </table>
            )}
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={() => { setEditId(null); setDraft(EMPTY); setAdding(true); }}
                disabled={adding}
                className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40">
                <Plus size={14} /> Ajouter un produit
              </button>
            </div>
          </>
        )}

        {/* ── Onglet réservations achats ── */}
        {tab === 'achats' && (
          loadingC ? (
            <div className="flex items-center gap-2 text-gray-400 py-12 px-6">
              <Loader2 size={18} className="animate-spin" /> Chargement...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['N°','Client','Produits','Total','Date','Statut',''].map(h => (
                    <th key={h} className="font-body text-xs font-semibold text-gray-500 text-left px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commandes.length === 0 ? (
                  <tr><td colSpan={7} className="text-center px-5 py-12 font-body text-sm text-gray-400">
                    Aucune réservation d'achat.
                  </td></tr>
                ) : commandes.map(cmd => {
                  const allLivres = cmd.statut === 'en-attente'
                    && cmd.articles.length > 0
                    && cmd.articles.every(a => a.livre);
                  return (
                  <tr key={cmd._id} className={`hover:bg-gray-50 transition-colors ${cmd.statut === 'annulee' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 font-body text-sm font-medium text-gray-900">{cmd.numero}</td>
                    <td className="px-5 py-4">
                      <p className="font-body text-sm text-gray-900">{cmd.clientNom}</p>
                      <p className="font-body text-xs text-gray-400">{cmd.clientEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="font-body text-xs space-y-0.5">
                        {cmd.articles.map((a, i) => (
                          <li key={i} className={`flex items-center gap-2 ${a.livre ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                            <span>{a.quantite}× {a.nom}</span>
                            {a.livre && (
                              <span className="inline-flex items-center gap-1 no-underline font-body text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                <Check size={9} /> Livré
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-5 py-4 font-body text-sm font-bold text-gray-900">{cmd.total.toFixed(2)} €</td>
                    <td className="px-5 py-4 font-body text-xs text-gray-500">{formatDate(cmd.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full border
                        ${cmd.statut === 'annulee'
                          ? 'bg-red-50 text-red-400 border-red-100'
                          : allLivres
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                        {cmd.statut === 'annulee'
                          ? 'Annulée'
                          : allLivres
                            ? 'Livrée'
                            : 'En attente'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {cmd.statut === 'en-attente' && (
                        <button
                          onClick={() => annulerCommande(cmd._id)}
                          title="Annuler cette commande"
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
