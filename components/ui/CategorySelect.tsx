'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

type Props = {
  value:      string;
  onChange:   (v: string) => void;
  categories: string[];
  /** classe Tailwind supplémentaire pour personnaliser la bordure/largeur */
  className?: string;
};

/**
 * Normalise un nom de catégorie pour détecter les doublons :
 * insensible à la casse, aux accents, aux espaces et au pluriel/singulier.
 * Ex : "SOINS", "Soin", "  soin " → "soin".
 */
function normalizeCat(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/\s+/g, ' ')
    .replace(/s$/, '');                               // pluriel ≈ singulier
}

/**
 * Sélecteur de catégorie avec création inline.
 * L'option spéciale "+ Nouvelle..." bascule vers un champ texte libre.
 * À la saisie d'une nouvelle catégorie, on alerte si une catégorie équivalente
 * existe déjà (même nom à la casse / accent / pluriel près).
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
    // Catégorie existante équivalente (hors correspondance exacte) ?
    const normValue = normalizeCat(value);
    const duplicate = normValue
      ? categories.find(c => c !== value && normalizeCat(c) === normValue)
      : undefined;

    return (
      <div className="flex flex-col gap-1.5">
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

        {duplicate && (
          <div className="flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2 py-1.5">
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="font-body text-[11px] text-amber-800 leading-snug">
              La catégorie <strong>« {duplicate} »</strong> existe déjà (au pluriel/à la casse près).{' '}
              <button
                type="button"
                onClick={() => { onChange(duplicate); setCreating(false); }}
                className="underline font-semibold hover:text-amber-900"
              >
                Utiliser « {duplicate} »
              </button>
            </p>
          </div>
        )}
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
