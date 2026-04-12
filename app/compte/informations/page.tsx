'use client';

import { useState, useEffect } from 'react';
import CompteNav from '@/components/public/CompteNav';
import { useAuth } from '@/lib/auth-context';
import { User, Users, Edit3, Save, Plus, Trash2, Loader2 } from 'lucide-react';

type UserData = {
  prenom: string; nom: string; email: string; telephone: string;
  autresPersonnes: { prenom: string; nom: string }[];
};

export default function InformationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data,    setData]    = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [draft,   setDraft]   = useState<UserData | null>(null);

  // Charge le profil complet depuis l'API (attend que la session soit prête)
  useEffect(() => {
    if (authLoading || !user) return;
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { setData(d); setDraft(d); })
      .catch(console.error);
  }, [authLoading, user?.id]);

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => d ? { ...d, [e.target.name]: e.target.value } : d);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const res = await fetch('/api/me', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(draft),
    });
    if (res.ok) {
      const updated = await res.json();
      setData(updated);
      setDraft(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  const removeOther = (idx: number) =>
    setDraft(d => d ? { ...d, autresPersonnes: d.autresPersonnes.filter((_, i) => i !== idx) } : d);

  const addOther = () =>
    setDraft(d => d ? { ...d, autresPersonnes: [...d.autresPersonnes, { prenom: '', nom: '' }] } : d);

  if (authLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-48 gap-2 text-white/60">
        <Loader2 size={18} className="animate-spin" /> Chargement...
      </div>
    );
  }

  const display = editing ? draft! : data;

  return (
    <div>
      <CompteNav />
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] uppercase text-white mb-6">Mes informations</h1>

      {/* Infos principales */}
      <div className="bg-white rounded-lg p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['prenom', 'nom', 'email', 'telephone'] as const).map(field => (
                <div key={field}>
                  <label className="font-body text-xs font-semibold text-gray-700 capitalize block mb-1">
                    {field.charAt(0).toUpperCase() + field.slice(1)} :
                  </label>
                  {editing ? (
                    <input name={field} value={(display as any)[field]} onChange={handleField}
                      disabled={field === 'email'}
                      className="block w-full border-b border-gray-300 pb-1 font-body text-sm text-gray-900 outline-none focus:border-yellow-500 disabled:opacity-50" />
                  ) : (
                    <p className="font-body text-sm text-gray-700">{(display as any)[field] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="btn-gold-outline text-xs px-5 py-2 flex items-center gap-2">
                  <Edit3 size={13} /> Modifier
                </button>
              ) : (
                <>
                  <button onClick={save} disabled={saving}
                    className="btn-gold text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Enregistrer
                  </button>
                  <button onClick={() => { setEditing(false); setDraft(data); }}
                    className="btn-gold-outline text-xs px-5 py-2">
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Autres personnes */}
      <div className="bg-white rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Users size={18} className="text-gray-500" />
          <h2 className="font-body text-base font-semibold text-gray-900">Autres personnes</h2>
        </div>
        <table className="w-full max-w-lg">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="font-body text-xs font-semibold text-gray-500 text-left pb-3 pr-8">Prénom</th>
              <th className="font-body text-xs font-semibold text-gray-500 text-left pb-3">Nom</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(editing ? draft! : data).autresPersonnes?.map((o, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 pr-8">
                  {editing ? (
                    <input value={o.prenom} onChange={e => setDraft(d => {
                      if (!d) return d;
                      const ap = [...d.autresPersonnes];
                      ap[i] = { ...ap[i], prenom: e.target.value };
                      return { ...d, autresPersonnes: ap };
                    })} className="border-b border-gray-200 text-sm font-body w-full outline-none focus:border-yellow-500" />
                  ) : (
                    <span className="font-body text-sm text-gray-700">{o.prenom}</span>
                  )}
                </td>
                <td className="py-3">
                  {editing ? (
                    <input value={o.nom} onChange={e => setDraft(d => {
                      if (!d) return d;
                      const ap = [...d.autresPersonnes];
                      ap[i] = { ...ap[i], nom: e.target.value };
                      return { ...d, autresPersonnes: ap };
                    })} className="border-b border-gray-200 text-sm font-body w-full outline-none focus:border-yellow-500" />
                  ) : (
                    <span className="font-body text-sm text-gray-700">{o.nom}</span>
                  )}
                </td>
                <td className="py-3 pl-4">
                  {editing && (
                    <button onClick={() => removeOther(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {editing && (
          <button onClick={addOther} className="flex items-center gap-2 mt-4 text-gray-400 hover:text-gray-700 transition-colors">
            <Plus size={14} /><span className="font-body text-sm">Ajouter une personne</span>
          </button>
        )}
      </div>
    </div>
  );
}
