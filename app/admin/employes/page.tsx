'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Mail, Phone, Building2, Trash2 } from 'lucide-react';

type Employe = {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  role: string;
};

export default function AdminEmployesPage() {
  const [employes,  setEmployes]  = useState<Employe[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '', societe: '',
  });
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    fetch('/api/employes')
      .then(r => r.json())
      .then(d => setEmployes(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg('');

    try {
      const res = await fetch('/api/employes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error ?? 'Erreur');
      } else {
        setEmployes(prev => [...prev, data]);
        setForm({ prenom: '', nom: '', email: '', telephone: '', societe: '' });
        setShowForm(false);
      }
    } catch {
      setErrMsg('Erreur réseau.');
    }
    setSaving(false);
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cet employé ?')) return;
    const res = await fetch(`/api/employes?id=${id}`, { method: 'DELETE' });
    if (res.ok) setEmployes(prev => prev.filter(e => e._id !== id));
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-body text-2xl font-bold text-gray-900">Employés</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="font-body text-xs font-medium bg-gray-900 text-white px-4 py-2.5 rounded-lg
            hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <UserPlus size={14} /> Ajouter un employé
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="font-body text-sm font-semibold text-gray-900 mb-4">Nouvel employé</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs text-gray-500 mb-1 block">Prénom *</label>
              <input
                value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                required placeholder="Prénom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div>
              <label className="font-body text-xs text-gray-500 mb-1 block">Nom</label>
              <input
                value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="Nom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div>
              <label className="font-body text-xs text-gray-500 mb-1 block">Email *</label>
              <input
                type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required placeholder="email@exemple.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div>
              <label className="font-body text-xs text-gray-500 mb-1 block">Téléphone</label>
              <input
                value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                placeholder="+596 696 ..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-body text-xs text-gray-500 mb-1 block">Société</label>
              <input
                value={form.societe} onChange={e => setForm(f => ({ ...f, societe: e.target.value }))}
                placeholder="Nom de la société (optionnel)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>

            {errMsg && (
              <p className="sm:col-span-2 text-red-500 text-xs bg-red-50 rounded px-3 py-2">{errMsg}</p>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit" disabled={saving}
                className="font-body text-sm font-medium bg-yellow-400 text-gray-900 px-5 py-2.5 rounded-lg
                  hover:bg-yellow-500 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Créer le compte
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                className="font-body text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
          <p className="font-body text-xs text-gray-400 mt-3">
            Un mot de passe temporaire sera généré. L'employé devra utiliser "Mot de passe oublié" pour définir son propre mot de passe.
          </p>
        </div>
      )}

      {/* Liste des employés */}
      <div className="grid gap-4">
        {employes.map(emp => (
          <div key={emp._id} className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="font-body text-sm font-bold text-gray-600">
                  {emp.prenom[0]}{emp.nom?.[0] ?? ''}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-semibold text-gray-900">
                    {emp.prenom} {emp.nom}
                  </span>
                  <span className={`font-body text-[10px] px-2 py-0.5 rounded-full
                    ${emp.role === 'admin'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                    {emp.role === 'admin' ? 'Gérant' : 'Employé'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                    <Mail size={10} /> {emp.email}
                  </span>
                  {emp.telephone && (
                    <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                      <Phone size={10} /> {emp.telephone}
                    </span>
                  )}
                  {emp.societe && (
                    <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                      <Building2 size={10} /> {emp.societe}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {emp.role !== 'admin' && (
              <button
                onClick={() => supprimer(emp._id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        {employes.length === 0 && (
          <p className="font-body text-sm text-gray-400 py-8 text-center">
            Aucun employé pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
