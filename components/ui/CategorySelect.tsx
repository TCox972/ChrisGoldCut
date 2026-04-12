'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Props = {
  value:      string;
  onChange:   (v: string) => void;
  categories: string[];
  /** classe Tailwind supplémentaire pour personnaliser la bordure/largeur */
  className?: string;
};

/**
 * Sélecteur de catégorie avec création inline.
 * L'option spéciale "+ Nouvelle..." bascule vers un champ texte libre.
 */
export default function CategorySelect({
  value,
  onChange,
  categories,
  className = '',
}: Props) {
  const [creating, setCreating] = useState(false);

  // Liste des catégories existantes + la valeur courante si absente
  const options = Array.from(new Set([...categories, value].filter(Boolean)));

  const baseCls =
    'border border-gray-200 rounded px-2 py-1.5 text-sm font-body outline-none ' +
    'focus:border-yellow-400 bg-white ' +
    className;

  if (creating) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={value}
          placeholder="Nouvelle catégorie"
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') setCreating(false);
            if (e.key === 'Escape') { onChange(options[0] ?? ''); setCreating(false); }
          }}
          className={baseCls}
        />
        <button
          type="button"
          onClick={() => { onChange(options[0] ?? ''); setCreating(false); }}
          className="text-gray-300 hover:text-gray-600"
          title="Annuler"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === '__new__') {
          onChange('');
          setCreating(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={baseCls}
    >
      {options.length === 0 && <option value="">—</option>}
      {options.map(c => <option key={c} value={c}>{c}</option>)}
      <option value="__new__">+ Nouvelle catégorie…</option>
    </select>
  );
}
