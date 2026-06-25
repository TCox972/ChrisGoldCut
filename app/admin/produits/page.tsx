'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Edit3, Trash2, Plus, Check, X, Loader2, Ban, ChevronUp, ChevronDown, Filter, GripVertical, Upload, Image as ImageIcon, RotateCcw } from 'lucide-react';
import CategorySelect from '@/components/ui/CategorySelect';
import ConfirmModal from '@/components/admin/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type Produit = {
  _id: string; categorie: string;
  nom: string; description: string; descriptionLongue?: string;
  prix: number; actif: boolean;
  image: string; images?: string[];
};

type CommandeAdmin = {
  _id: string; numero: string; clientNom: string; clientEmail: string;
  articles: { nom: string; quantite: number; prix: number; livre?: boolean }[];
  total: number; statut: 'en-attente' | 'annulee'; createdAt: string;
};

export default function AdminProduitsPage() {
  const [tab,      setTab]      = useState<'liste' | 'desactives' | 'achats'>('liste');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [commandes,setCommandes]= useState<CommandeAdmin[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingC, setLoadingC] = useState(false);

  // Toast d'erreur global (auto-disparition après 5 s)
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

  // Filtre par catégorie
  const [filterCat, setFilterCat] = useState<string>('');

  // Ordre des catégories
  const [catOrder, setCatOrder]     = useState<string[]>([]);
  const [showOrder, setShowOrder]   = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Modale d'édition
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('edit');
  const [modalData, setModalData] = useState<Partial<Produit>>({});
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Catégories existantes
  const availableCategories = useMemo(
    () => Array.from(new Set(produits.map(p => p.categorie).filter(Boolean))),
    [produits],
  );

  // Catégories ordonnées
  const orderedCategories = useMemo(() => {
    const inOrder = catOrder.filter(c => availableCategories.includes(c));
    const rest = availableCategories.filter(c => !catOrder.includes(c));
    return [...inOrder, ...rest];
  }, [catOrder, availableCategories]);

  const sortByCategory = (list: Produit[]) =>
    [...list].sort((a, b) => {
      const ia = orderedCategories.indexOf(a.categorie);
      const ib = orderedCategories.indexOf(b.categorie);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  // Produits actifs filtrés et triés (onglet « Liste »)
  const displayedProduits = useMemo(() => {
    const actifs = produits.filter(p => p.actif);
    const filtered = filterCat ? actifs.filter(p => p.categorie === filterCat) : actifs;
    return sortByCategory(filtered);
  }, [produits, filterCat, orderedCategories]);

  // Produits désactivés triés (onglet « Désactivés »)
  const inactiveProduits = useMemo(
    () => sortByCategory(produits.filter(p => !p.actif)),
    [produits, orderedCategories],
  );
  const inactiveCount = inactiveProduits.length;

  // ─── Chargement produits ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/produits?all=true').then(r => r.json()),
      fetch('/api/category-order?type=produits').then(r => r.json()),
    ])
      .then(([prods, orderData]) => {
        setProduits(Array.isArray(prods) ? prods : []);
        setCatOrder(Array.isArray(orderData?.order) ? orderData.order : []);
      })
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

  // ─── Modale : ouvrir en édition ───────────────────────────────────────────
  const openEdit = (p: Produit) => {
    setModalMode('edit');
    setModalData({
      _id: p._id,
      categorie: p.categorie,
      nom: p.nom,
      description: p.description,
      descriptionLongue: p.descriptionLongue || '',
      prix: p.prix,
    });
    setModalImages(p.images?.length ? [...p.images] : p.image ? [p.image] : []);
    setModalOpen(true);
  };

  // ─── Modale : ouvrir en ajout ─────────────────────────────────────────────
  const openAdd = () => {
    setModalMode('add');
    setModalData({
      categorie: availableCategories[0] ?? '',
      nom: '',
      description: '',
      descriptionLongue: '',
      prix: 0,
    });
    setModalImages([]);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setModalData({}); setModalImages([]); };

  const handleField = (field: string, value: string | number) =>
    setModalData(d => ({ ...d, [field]: value }));

  // ─── Upload image ─────────────────────────────────────────────────────────
  const UPLOAD_MAX = 5 * 1024 * 1024;
  const UPLOAD_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

  const uploadImage = async (file: File) => {
    // Validation client (cohérente avec le serveur)
    if (!UPLOAD_TYPES.includes(file.type)) {
      alert(`Format non supporté. Acceptés : JPG, PNG, WEBP, AVIF, GIF.`);
      return;
    }
    if (file.size > UPLOAD_MAX) {
      alert(`Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 5 Mo.`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (res.ok) {
        const { url } = await res.json();
        setModalImages(prev => [...prev, url]);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Erreur lors de l\'upload de l\'image.');
      }
    } catch {
      alert('Erreur réseau lors de l\'upload.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setModalImages(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Sauvegarder (POST ou PUT) ───────────────────────────────────────────
  const saveModal = async () => {
    if (!modalData.nom?.trim() || !modalData.categorie?.trim()) return;
    setSaving(true);
    try {
      const body = {
        categorie: modalData.categorie,
        nom: modalData.nom,
        description: modalData.description || '',
        descriptionLongue: modalData.descriptionLongue || '',
        prix: modalData.prix ?? 0,
        image: modalImages[0] || '',
        images: modalImages,
      };

      if (modalMode === 'edit' && modalData._id) {
        const res = await fetch(`/api/produits/${modalData._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setProduits(prev => prev.map(p => p._id === modalData._id ? updated : p));
          closeModal();
        } else {
          const err = await res.json().catch(() => null);
          alert(err?.error || 'Erreur lors de la mise à jour.');
        }
      } else {
        const res = await fetch('/api/produits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setProduits(prev => [...prev, created]);
          closeModal();
        } else {
          const err = await res.json().catch(() => null);
          alert(err?.error || 'Erreur lors de la création.');
        }
      }
    } finally { setSaving(false); }
  };

  // ─── Modale de confirmation unifiée ───────────────────────────────────────
  // Le pendingAction décrit l'action à exécuter quand l'utilisateur confirme.
  type PendingAction =
    | { type: 'deleteProduit'; id: string; nom: string }
    | { type: 'hardDeleteProduit'; id: string; nom: string }
    | { type: 'deleteCategorie'; nom: string }
    | { type: 'cancelCommande'; id: string; numero: string };
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const catItemsCount = (cat: string) => produits.filter(p => p.categorie === cat).length;

  const askDeleteProduit = (p: Produit) =>
    setPendingAction({ type: 'deleteProduit', id: p._id, nom: p.nom });
  const askHardDeleteProduit = (p: Produit) =>
    setPendingAction({ type: 'hardDeleteProduit', id: p._id, nom: p.nom });
  const askDeleteCategorie = (nom: string) =>
    setPendingAction({ type: 'deleteCategorie', nom });
  const askCancelCommande = (c: CommandeAdmin) =>
    setPendingAction({ type: 'cancelCommande', id: c._id, numero: c.numero });

  // Réactivation directe (sans confirmation)
  const reactivateProduit = async (id: string) => {
    try {
      const res = await fetch(`/api/produits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProduits(prev => prev.map(p => p._id === id ? updated : p));
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de réactiver ce produit. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === 'deleteProduit') {
        const res = await fetch(`/api/produits/${pendingAction.id}`, { method: 'DELETE' });
        if (res.ok) {
          // Désactivation : on garde le produit en mémoire avec actif=false
          // (il bascule dans l'onglet « Désactivés »).
          setProduits(prev => prev.map(p => p._id === pendingAction.id ? { ...p, actif: false } : p));
          setPendingAction(null);
        } else {
          const data = await res.json().catch(() => null);
          setActionError(data?.error || 'Impossible de désactiver ce produit. Réessayez.');
        }
      } else if (pendingAction.type === 'hardDeleteProduit') {
        const res = await fetch(`/api/produits/${pendingAction.id}?hard=true`, { method: 'DELETE' });
        if (res.ok) {
          setProduits(prev => prev.filter(p => p._id !== pendingAction.id));
          setPendingAction(null);
        } else {
          const data = await res.json().catch(() => null);
          setActionError(data?.error || 'Impossible de supprimer ce produit. Réessayez.');
        }
      } else if (pendingAction.type === 'deleteCategorie') {
        const cat = pendingAction.nom;
        const res = await fetch(`/api/category-order?type=produits&nom=${encodeURIComponent(cat)}`, { method: 'DELETE' });
        if (res.ok) {
          setProduits(prev => prev.filter(p => p.categorie !== cat));
          setCatOrder(prev => prev.filter(c => c !== cat));
          setPendingAction(null);
        } else {
          const data = await res.json().catch(() => null);
          setActionError(data?.error || 'Impossible de supprimer cette catégorie. Réessayez.');
        }
      } else if (pendingAction.type === 'cancelCommande') {
        const res = await fetch(`/api/commandes/${pendingAction.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: 'annulee' }),
        });
        if (res.ok) {
          setCommandes(prev => prev.map(c => c._id === pendingAction.id ? { ...c, statut: 'annulee' } : c));
          setPendingAction(null);
        } else {
          const data = await res.json().catch(() => null);
          setActionError(data?.error || 'Impossible d\'annuler cette commande. Réessayez.');
        }
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingTitle = pendingAction?.type === 'deleteProduit'
    ? 'Désactiver ce produit ?'
    : pendingAction?.type === 'hardDeleteProduit'
      ? 'Supprimer définitivement ?'
      : pendingAction?.type === 'deleteCategorie'
        ? 'Supprimer cette catégorie ?'
        : pendingAction?.type === 'cancelCommande'
          ? 'Annuler cette commande ?'
          : '';
  const pendingMessage = pendingAction?.type === 'deleteProduit'
    ? `Le produit "${pendingAction.nom}" ne sera plus visible côté client. Il peut être réactivé plus tard.`
    : pendingAction?.type === 'hardDeleteProduit'
      ? `Le produit "${pendingAction.nom}" sera supprimé définitivement et ne pourra pas être récupéré. Les commandes passées ne sont pas affectées.`
      : pendingAction?.type === 'deleteCategorie'
        ? (catItemsCount(pendingAction.nom) > 0
            ? `La catégorie « ${pendingAction.nom} » et ses ${catItemsCount(pendingAction.nom)} article(s) seront supprimés définitivement. Cette action est irréversible.`
            : `La catégorie « ${pendingAction.nom} » (vide) sera supprimée de l'ordre d'affichage.`)
        : pendingAction?.type === 'cancelCommande'
          ? `La commande ${pendingAction.numero} sera marquée comme annulée. Cette action est irréversible côté client.`
          : '';
  const pendingConfirmLabel = pendingAction?.type === 'deleteProduit'
    ? 'Désactiver'
    : pendingAction?.type === 'hardDeleteProduit'
      ? 'Supprimer définitivement'
      : pendingAction?.type === 'deleteCategorie'
        ? 'Supprimer la catégorie'
        : 'Annuler la commande';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

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
      const res = await fetch('/api/category-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'produits', order: orderedCategories }),
      });
      if (res.ok) {
        setShowOrder(false);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible d\'enregistrer l\'ordre des catégories. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div>
      {/* Modale de confirmation unifiée */}
      <ConfirmModal
        open={!!pendingAction}
        title={pendingTitle}
        message={pendingMessage}
        confirmLabel={pendingConfirmLabel}
        variant="danger"
        loading={actionLoading}
        onConfirm={runPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      {/* Toast d'erreur (auto-disparition) */}
      {actionError && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-red-600 text-white rounded-lg shadow-xl px-4 py-3 flex items-start gap-3">
          <span className="font-body text-sm flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            aria-label="Fermer"
            className="text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-body text-2xl font-bold text-gray-900">Produits</h1>
        {tab === 'liste' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <Filter size={14} className="text-gray-400" />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="font-body text-sm text-gray-700 outline-none bg-transparent">
                <option value="">Toutes les catégories</option>
                {orderedCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setShowOrder(!showOrder)}
              className={`flex items-center gap-2 font-body text-xs font-semibold px-4 py-2 rounded-lg transition-colors
                ${showOrder ? 'bg-yellow-400 text-gray-900' : 'bg-white text-gray-600 border border-gray-200 hover:border-yellow-300'}`}>
              <GripVertical size={14} /> Ordre des catégories
            </button>
          </div>
        )}
      </div>

      {/* Panel de réordonnement */}
      {showOrder && tab === 'liste' && (
        <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-6">
          <p className="font-body text-xs text-gray-500 mb-3">
            Réorganisez l'ordre d'affichage des catégories sur la boutique :
          </p>
          <div className="space-y-1">
            {orderedCategories.map((cat, i) => (
              <div key={cat} className="flex items-center gap-3 bg-gray-50 rounded px-3 py-2">
                <GripVertical size={14} className="text-gray-300" />
                <span className="font-body text-sm text-gray-900 flex-1">
                  {cat}
                  <span className="text-gray-400 font-normal ml-2">({catItemsCount(cat)})</span>
                </span>
                <button onClick={() => moveCategory(i, -1)} disabled={i === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronUp size={16} /></button>
                <button onClick={() => moveCategory(i, 1)} disabled={i === orderedCategories.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronDown size={16} /></button>
                <button onClick={() => askDeleteCategorie(cat)} title="Supprimer la catégorie"
                  aria-label="Supprimer la catégorie"
                  className="text-gray-300 hover:text-red-500 transition-colors ml-1"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowOrder(false)}
              className="font-body text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Annuler</button>
            <button onClick={saveCategoryOrder} disabled={savingOrder}
              className="flex items-center gap-2 font-body text-xs font-semibold bg-yellow-400 text-gray-900 px-4 py-1.5 rounded hover:bg-yellow-500 disabled:opacity-50">
              {savingOrder ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Enregistrer l'ordre
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Onglets */}
        <div className="grid grid-cols-3 border-b border-gray-100">
          {([
            ['liste', 'Liste des produits'],
            ['desactives', `Désactivés${inactiveCount ? ` (${inactiveCount})` : ''}`],
            ['achats', 'Réservations d\'achats clients'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-4 font-body text-sm font-medium transition-colors
                ${tab === t ? 'text-gray-900 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-600'}`}>
              {label}
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
              <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Image', 'Catégorie', 'Désignation', 'Infos', 'Prix', ''].map(h => (
                      <th key={h} className="font-body text-xs font-semibold text-gray-500 text-left px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedProduits.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openEdit(p)}>
                      <td className="px-5 py-3">
                        {(p.images?.[0] || p.image) ? (
                          <img src={p.images?.[0] || p.image} alt={p.nom}
                            className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <ImageIcon size={16} className="text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-gray-600">{p.categorie}</td>
                      <td className="px-5 py-3 font-body text-sm text-gray-900 font-medium">{p.nom}</td>
                      <td className="px-5 py-3 font-body text-sm text-gray-500">{p.description}</td>
                      <td className="px-5 py-3 font-body text-sm text-gray-600">{p.prix} €</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="text-gray-300 hover:text-yellow-500 transition-colors"><Edit3 size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); askDeleteProduit(p); }}
                            className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Désactiver"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={openAdd}
                className="flex items-center gap-2 font-body text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <Plus size={14} /> Ajouter un produit
              </button>
            </div>
          </>
        )}

        {/* ── Onglet produits désactivés ── */}
        {tab === 'desactives' && (
          loadingP ? (
            <div className="flex items-center gap-2 text-gray-400 py-12 px-6">
              <Loader2 size={18} className="animate-spin" /> Chargement...
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Image', 'Catégorie', 'Désignation', 'Infos', 'Prix', ''].map(h => (
                    <th key={h} className="font-body text-xs font-semibold text-gray-500 text-left px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inactiveProduits.length === 0 ? (
                  <tr><td colSpan={6} className="text-center px-5 py-12 font-body text-sm text-gray-400">
                    Aucun produit désactivé.
                  </td></tr>
                ) : inactiveProduits.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      {(p.images?.[0] || p.image) ? (
                        <img src={p.images?.[0] || p.image} alt={p.nom}
                          className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <ImageIcon size={16} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 font-body text-sm text-gray-600">{p.categorie}</td>
                    <td className="px-5 py-3 font-body text-sm text-gray-900 font-medium">{p.nom}</td>
                    <td className="px-5 py-3 font-body text-sm text-gray-500">{p.description}</td>
                    <td className="px-5 py-3 font-body text-sm text-gray-600">{p.prix} €</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => reactivateProduit(p._id)}
                          className="text-gray-300 hover:text-green-500 transition-colors" aria-label="Réactiver" title="Réactiver"><RotateCcw size={15} /></button>
                        <button onClick={() => askHardDeleteProduit(p)}
                          className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Supprimer définitivement" title="Supprimer définitivement"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )
        )}

        {/* ── Onglet réservations achats ── */}
        {tab === 'achats' && (
          loadingC ? (
            <div className="flex items-center gap-2 text-gray-400 py-12 px-6">
              <Loader2 size={18} className="animate-spin" /> Chargement...
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
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
                        {cmd.statut === 'annulee' ? 'Annulée' : allLivres ? 'Livrée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {cmd.statut === 'en-attente' && (
                        <button onClick={() => askCancelCommande(cmd)} title="Annuler cette commande"
                          className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Annuler la commande"><Ban size={16} /></button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table></div>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALE D'ÉDITION / AJOUT PRODUIT
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-body text-lg font-bold text-gray-900">
                {modalMode === 'add' ? 'Nouveau produit' : 'Modifier le produit'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Catégorie + Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    Catégorie
                  </label>
                  <CategorySelect
                    value={modalData.categorie || ''}
                    onChange={v => handleField('categorie', v)}
                    categories={availableCategories}
                  />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    Nom du produit
                  </label>
                  <input value={modalData.nom || ''} onChange={e => handleField('nom', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400"
                    placeholder="Nom du produit" />
                </div>
              </div>

              {/* Infos courtes */}
              <div>
                <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Infos courtes (volume, contenance...)
                </label>
                <input value={modalData.description || ''} onChange={e => handleField('description', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400"
                  placeholder="ex: 250 ml, Unité..." />
              </div>

              {/* Description longue */}
              <div>
                <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Description détaillée
                </label>
                <textarea value={modalData.descriptionLongue || ''} onChange={e => handleField('descriptionLongue', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400 resize-none"
                  placeholder="Description complète du produit, ingrédients, conseils d'utilisation..." />
              </div>

              {/* Prix */}
              <div>
                <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Prix (€)
                </label>
                <input type="number" min="0" step="0.5" value={modalData.prix ?? 0}
                  onChange={e => handleField('prix', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
              </div>

              {/* Photos */}
              <div>
                <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Photos du produit
                </label>
                <div className="flex flex-wrap gap-3">
                  {modalImages.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Photo ${i + 1}`}
                        className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                      <button onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {/* Bouton upload */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1
                      text-gray-400 hover:border-yellow-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                    <span className="text-[10px] font-body">Ajouter</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); e.target.value = ''; }} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal}
                className="font-body text-sm text-gray-400 hover:text-gray-600 px-4 py-2">
                Annuler
              </button>
              <button onClick={saveModal} disabled={saving || !modalData.nom?.trim() || !modalData.categorie?.trim()}
                className="flex items-center gap-2 font-body text-sm font-semibold bg-yellow-400 text-gray-900 px-6 py-2.5 rounded-lg
                  hover:bg-yellow-500 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {modalMode === 'add' ? 'Créer le produit' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
