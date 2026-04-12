'use client';

import { useState, useEffect, useMemo } from 'react';
import { Edit3, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
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
  const [adding,  setAdding]  = useState(false); // mode "nouvelle ligne"

  // Catégories existantes, dérivées de la liste courante
  const availableCategories = useMemo(
    () => Array.from(new Set(items.map(i => i.categorie).filter(Boolean))),
    [items],
  );

  // ─── Chargement ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/prestations?all=true') // all=true → inclut les inactives pour l'admin
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
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

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="font-body text-2xl font-bold text-gray-900 mb-6">Prestations</h1>

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
              {items.map(item => {
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
