'use client';

import { useState, useEffect, useMemo } from 'react';
import { Edit3, Trash2, Plus, Check, X, Loader2, ChevronUp, ChevronDown, Filter, GripVertical } from 'lucide-react';
import CategorySelect from '@/components/ui/CategorySelect';

type Prestation = {
  _id:       string;
  categorie: string;
  nom:       string;
  duree:     string;
  prix:      number;
  actif:     boolean;
};

type Draft = Omit<Prestation, '_id' | 'actif'>;

const EMPTY_DRAFT: Draft = { categorie: '', nom: '', duree: '30 min', prix: 0 };

export default function AdminPrestationsPage() {
  const [items,   setItems]   = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [draft,   setDraft]   = useState<Draft>(EMPTY_DRAFT);
  const [saving,  setSaving]  = useState(false);
  const [adding,  setAdding]  = useState(false);

  // Filtre par catégorie
  const [filterCat, setFilterCat] = useState<string>('');

  // Ordre des catégories
  const [catOrder, setCatOrder]     = useState<string[]>([]);
  const [showOrder, setShowOrder]   = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Catégories existantes, dérivées de la liste courante
  const availableCategories = useMemo(
    () => Array.from(new Set(items.map(i => i.categorie).filter(Boolean))),
    [items],
  );

  // Catégories ordonnées (celles dans catOrder d'abord, puis les nouvelles)
  const orderedCategories = useMemo(() => {
    const inOrder = catOrder.filter(c => availableCategories.includes(c));
    const rest = availableCategories.filter(c => !catOrder.includes(c));
    return [...inOrder, ...rest];
  }, [catOrder, availableCategories]);

  // Items filtrés
  const displayedItems = useMemo(() => {
    const filtered = filterCat ? items.filter(i => i.categorie === filterCat) : items;
    // Trier par ordre de catégorie
    return [...filtered].sort((a, b) => {
      const ia = orderedCategories.indexOf(a.categorie);
      const ib = orderedCategories.indexOf(b.categorie);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [items, filterCat, orderedCategories]);

  // ─── Chargement ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/prestations?all=true').then(r => r.json()),
      fetch('/api/category-order?type=prestations').then(r => r.json()),
    ])
      .then(([prestas, orderData]) => {
        setItems(Array.isArray(prestas) ? prestas : []);
        setCatOrder(Array.isArray(orderData?.order) ? orderData.order : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Édition ────────────────────────────────────────────────────────────────
  const startEdit = (p: Prestation) => {
    setAdding(false);
    setEditId(p._id);
    setDraft({ categorie: p.categorie, nom: p.nom, duree: p.duree, prix: p.prix });
  };

  const cancelEdit = () => { setEditId(null); setAdding(false); };

  const handleDraft = (field: keyof Draft, value: string | number) =>
    setDraft(d => ({ ...d, [field]: value }));

  // ─── Sauvegarde (PUT) ────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prestations/${editId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(p => p._id === editId ? updated : p));
        setEditId(null);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Erreur lors de la mise à jour.');
      }
    } finally { setSaving(false); }
  };

  // ─── Création (POST) ─────────────────────────────────────────────────────────
  const startAdd = () => {
    setEditId(null);
    setDraft({ ...EMPTY_DRAFT, categorie: availableCategories[0] ?? '' });
    setAdding(true);
  };

  const confirmAdd = async () => {
    if (!draft.nom.trim() || !draft.categorie.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/prestations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      });
      if (res.ok) {
        const created = await res.json();
        setItems(prev => [...prev, created]);
        setAdding(false);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Erreur lors de la création.');
      }
    } finally { setSaving(false); }
  };

  // ─── Suppression douce (DELETE → actif:false) ─────────────────────────────
  const supprimer = async (id: string) => {
    if (!confirm('Désactiver cette prestation ?')) return;
    const res = await fetch(`/api/prestations/${id}`, { method: 'DELETE' });
    if (res.ok) setItems(prev => prev.filter(p => p._id !== id));
  };

  // ─── Réordonnement des catégories ─────────────────────────────────────────
  const moveCategory = (index: number, direction: -1 | 1) => {
    const newOrder = [...orderedCategories];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setCatOrder(newOrder);
  };

  const saveCategoryOrder = async () => {
    setSavingOrder(true);
    try {
      await fetch('/api/category-order', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'prestations', order: orderedCategories }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOrder(false);
      setShowOrder(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-body text-2xl font-bold text-gray-900">Prestations</h1>
        <div className="flex items-center gap-3">
          {/* Filtre catégorie */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="font-body text-sm text-gray-700 outline-none bg-transparent"
            >
              <option value="">Toutes les catégories</option>
              {orderedCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Bouton ordre des catégories */}
          <button
            onClick={() => setShowOrder(!showOrder)}
            className={`flex items-center gap-2 font-body text-xs font-semibold px-4 py-2 rounded-lg transition-colors
              ${showOrder
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-yellow-300'}`}
          >
            <GripVertical size={14} /> Ordre des catégories
          </button>
        </div>
      </div>

      {/* Panel de réordonnement */}
      {showOrder && (
        <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-6">
          <p className="font-body text-xs text-gray-500 mb-3">
            Réorganisez l'ordre d'affichage des catégories sur la vitrine du site :
          </p>
          <div className="space-y-1">
            {orderedCategories.map((cat, i) => (
              <div key={cat} className="flex items-center gap-3 bg-gray-50 rounded px-3 py-2">
                <GripVertical size={14} className="text-gray-300" />
                <span className="font-body text-sm text-gray-900 flex-1">{cat}</span>
                <button
                  onClick={() => moveCategory(i, -1)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveCategory(i, 1)}
                  disabled={i === orderedCategories.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowOrder(false)}
              className="font-body text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
            >
              Annuler
            </button>
            <button
              onClick={saveCategoryOrder}
              disabled={savingOrder}
              className="flex items-center gap-2 font-body text-xs font-semibold bg-yellow-400 text-gray-900 px-4 py-1.5 rounded
                hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {savingOrder ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Enregistrer l'ordre
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Catégorie', 'Prestation', 'Durée', 'Prix', ''].map(h => (
                  <th key={h} className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">

              {/* ── Lignes existantes ── */}
              {displayedItems.map(item => {
                const isEditing = editId === item._id;
                return (
                  <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${!item.actif ? 'opacity-40' : ''}`}>
                    {/* Catégorie */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <CategorySelect
                          value={draft.categorie}
                          onChange={v => handleDraft('categorie', v)}
                          categories={availableCategories}
                        />
                      ) : (
                        <span className="font-body text-sm text-gray-600">{item.categorie}</span>
                      )}
                    </td>

                    {/* Nom */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          value={draft.nom}
                          onChange={e => handleDraft('nom', e.target.value)}
                          className="border border-gray-200 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-400 w-44"
                        />
                      ) : (
                        <span className="font-body text-sm text-gray-900">{item.nom}</span>
                      )}
                    </td>

                    {/* Durée */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          value={draft.duree}
                          onChange={e => handleDraft('duree', e.target.value)}
                          placeholder="ex: 30 min"
                          className="border border-gray-200 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-400 w-28"
                        />
                      ) : (
                        <span className="font-body text-sm text-gray-500">{item.duree}</span>
                      )}
                    </td>

                    {/* Prix */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" step="0.5"
                            value={draft.prix}
                            onChange={e => handleDraft('prix', parseFloat(e.target.value))}
                            className="border border-gray-200 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-400 w-20"
                          />
                          <span className="text-gray-400 text-sm">€</span>
                        </div>
                      ) : (
                        <span className="font-body text-sm text-gray-600">{item.prix} €</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit} disabled={saving}
                              className="text-green-500 hover:text-green-700 disabled:opacity-50 transition-colors"
                            >
                              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                            </button>
                            <button onClick={cancelEdit} className="text-gray-300 hover:text-gray-600 transition-colors">
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="text-gray-300 hover:text-yellow-500 transition-colors">
                              <Edit3 size={15} />
                            </button>
                            <button onClick={() => supprimer(item._id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* ── Ligne d'ajout ── */}
              {adding && (
                <tr className="bg-yellow-50">
                  <td className="px-6 py-3">
                    <CategorySelect
                      value={draft.categorie}
                      onChange={v => handleDraft('categorie', v)}
                      categories={availableCategories}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      value={draft.nom} placeholder="Nom de la prestation"
                      onChange={e => handleDraft('nom', e.target.value)}
                      className="border border-yellow-300 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-500 w-44"
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      value={draft.duree} placeholder="30 min"
                      onChange={e => handleDraft('duree', e.target.value)}
                      className="border border-yellow-300 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-500 w-28"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" step="0.5"
                        value={draft.prix}
                        onChange={e => handleDraft('prix', parseFloat(e.target.value))}
                        className="border border-yellow-300 rounded px-3 py-1.5 text-sm font-body outline-none focus:border-yellow-500 w-20"
                      />
                      <span className="text-gray-400 text-sm">€</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={confirmAdd} disabled={saving || !draft.nom.trim() || !draft.categorie.trim()}
                        className="text-green-500 hover:text-green-700 disabled:opacity-40 transition-colors"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      </button>
                      <button onClick={cancelEdit} className="text-gray-300 hover:text-gray-600 transition-colors">
                        <X size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Bouton ajouter */}
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={startAdd} disabled={adding}
              className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
            >
              <Plus size={14} /> Ajouter une prestation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
