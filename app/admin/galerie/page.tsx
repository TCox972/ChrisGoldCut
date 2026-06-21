'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Loader2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

type GalleryItem = {
  _id:      string;
  url:      string;
  publicId: string;
  ordre:    number;
};

const UPLOAD_MAX   = 5 * 1024 * 1024;
const UPLOAD_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export default function AdminGaleriePage() {
  const [items,    setItems]    = useState<GalleryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [pendingDelete, setPendingDelete] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Toast d'erreur global
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

  // ─── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setActionError('Impossible de charger la galerie.'))
      .finally(() => setLoading(false));
  }, []);

  // ─── Upload nouvelle photo ────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!UPLOAD_TYPES.includes(file.type)) {
      setActionError('Format non supporté. Acceptés : JPG, PNG, WEBP, AVIF, GIF.');
      return;
    }
    if (file.size > UPLOAD_MAX) {
      setActionError(`Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} Mo). Max : 5 Mo.`);
      return;
    }

    setUploading(true);
    try {
      // 1. Upload vers Cloudinary via la route /api/upload existante
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        setActionError(data?.error || 'Erreur lors de l\'upload.');
        return;
      }
      const { url, publicId } = await uploadRes.json();

      // 2. Enregistrer la référence en BDD
      const saveRes = await fetch('/api/gallery', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url, publicId }),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => null);
        setActionError(data?.error || 'Photo uploadée mais non enregistrée.');
        return;
      }
      const created = await saveRes.json();
      setItems(prev => [...prev, created]);
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ─── Réordonner ───────────────────────────────────────────────────────────
  const persistOrder = async (next: GalleryItem[]) => {
    try {
      const res = await fetch('/api/gallery', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: next.map(i => i._id) }),
      });
      if (!res.ok) {
        setActionError('Impossible d\'enregistrer le nouvel ordre.');
      }
    } catch {
      setActionError('Erreur réseau lors du tri.');
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persistOrder(next);
  };

  // ─── Supprimer ────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${pendingDelete._id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i._id !== pendingDelete._id));
        setPendingDelete(null);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de supprimer cette photo.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-12">
        <Loader2 size={18} className="animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div>
      <ConfirmModal
        open={!!pendingDelete}
        title="Supprimer cette photo ?"
        message="La photo sera retirée de la galerie et de Cloudinary. Cette action est définitive."
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {actionError && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-red-600 text-white rounded-lg shadow-xl px-4 py-3 flex items-start gap-3">
          <span className="font-body text-sm flex-1">{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Fermer" className="text-white/70 hover:text-white">×</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-body text-2xl font-bold text-gray-900">Galerie d'accueil</h1>
          <p className="font-body text-sm text-gray-500 mt-1">
            Photos affichées sur la page d'accueil. Glissez-les pour réordonner, ou utilisez les flèches.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="font-body text-sm font-medium bg-gray-900 text-white px-4 py-2.5 rounded-lg
            hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Upload...</>
            : <><Upload size={14} /> Ajouter une photo</>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={UPLOAD_TYPES.join(',')}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 border-dashed p-12 text-center">
          <ImageIcon size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-body text-sm text-gray-500">
            Aucune photo dans la galerie. Cliquez sur <strong>Ajouter une photo</strong> pour commencer.
          </p>
          <p className="font-body text-xs text-gray-400 mt-2">
            Tant que la galerie est vide, des photos par défaut s'affichent sur la page d'accueil.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <div
              key={item._id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden group relative"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img src={item.url} alt={`Galerie ${i + 1}`} className="w-full h-full object-cover" />
              </div>

              {/* Position + actions */}
              <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs font-bold px-2 py-0.5 rounded">
                #{i + 1}
              </div>
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="bg-white/90 rounded p-1 shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Monter"
                  title="Monter"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="bg-white/90 rounded p-1 shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Descendre"
                  title="Descendre"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPendingDelete(item)}
                className="absolute bottom-2 right-2 bg-red-500/90 text-white rounded p-1.5 shadow
                  hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Supprimer"
                title="Supprimer cette photo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
