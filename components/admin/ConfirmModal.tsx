'use client';

import { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modale de confirmation stylée pour l'espace admin.
 * Remplace les `confirm()` natifs du navigateur — apparence cohérente avec le
 * design du salon, support clavier (Échap pour annuler) et état "loading"
 * pendant l'action serveur.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={() => !loading && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl relative"
      >
        <button
          type="button"
          onClick={() => !loading && onCancel()}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-gray-300 hover:text-gray-700 transition-colors"
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${isDanger ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 pt-1">
            <h3 id="confirm-modal-title" className="font-body text-base font-semibold text-gray-900">
              {title}
            </h3>
            {message && (
              <div className="font-body text-sm text-gray-500 mt-2 leading-relaxed">
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="font-body text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg
              hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`font-body text-sm font-semibold px-4 py-2 rounded-lg transition-colors
              flex items-center justify-center gap-2 disabled:opacity-60
              ${isDanger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'}`}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> En cours...</>
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
