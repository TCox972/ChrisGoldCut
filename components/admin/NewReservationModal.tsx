'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check, Search, UserPlus, Plus, Mail } from 'lucide-react';

type PrestationItem = { _id: string; categorie: string; nom: string; duree: string; prix: number };
type StaffMember = { _id: string; prenom: string; nom: string; role: string };
type ClientLite = { _id: string; prenom: string; nom: string; email: string; telephone: string };

const MAX_PRESTATIONS = 3;

const ALL_SLOTS = (() => {
  const s: string[] = [];
  for (let m = 9 * 60; m < 19 * 60; m += 30) {
    s.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return s;
})();

export default function NewReservationModal({
  open, onClose, onCreated, isAdmin, currentUserId, staff, prestations, defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isAdmin: boolean;
  currentUserId: string;
  staff: StaffMember[];
  prestations: PrestationItem[];
  defaultDate: string; // YYYY-MM-DD
}) {
  const [date, setDate]   = useState(defaultDate);
  const [heure, setHeure] = useState('09:00');
  const [employeId, setEmployeId] = useState(isAdmin ? '' : currentUserId);
  const [selectedPrest, setSelectedPrest] = useState<string[]>([]);

  const [mode, setMode] = useState<'existing' | 'passager'>('existing');

  // Client existant
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ClientLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientLite | null>(null);

  // Passager
  const [pPrenom, setPPrenom] = useState('');
  const [pNom, setPNom]       = useState('');
  const [pTel, setPTel]       = useState('');
  const [pEmail, setPEmail]   = useState('');
  const [sendInvite, setSendInvite] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Réinitialise à l'ouverture
  useEffect(() => {
    if (!open) return;
    setDate(defaultDate);
    setHeure('09:00');
    setEmployeId(isAdmin ? '' : currentUserId);
    setSelectedPrest([]);
    setMode('existing');
    setQ(''); setResults([]); setSelectedClient(null);
    setPPrenom(''); setPNom(''); setPTel(''); setPEmail(''); setSendInvite(false);
    setError('');
  }, [open, defaultDate, isAdmin, currentUserId]);

  // Recherche clients (debounce)
  useEffect(() => {
    if (mode !== 'existing' || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/clients?q=${encodeURIComponent(q.trim())}&limit=8`)
        .then(r => r.json())
        .then(d => setResults(Array.isArray(d) ? d : (d.clients ?? [])))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  if (!open) return null;

  const togglePrest = (nom: string) =>
    setSelectedPrest(prev =>
      prev.includes(nom) ? prev.filter(p => p !== nom)
      : prev.length < MAX_PRESTATIONS ? [...prev, nom] : prev,
    );

  const submit = async () => {
    setError('');
    if (selectedPrest.length < 1) { setError('Choisissez au moins une prestation.'); return; }

    // Heure murale du salon stockée en UTC (cohérent avec tout le projet).
    const dateISO = `${date}T${heure}:00.000Z`;

    const payload: Record<string, unknown> = {
      date: dateISO,
      prestations: selectedPrest,
      employeId: isAdmin ? (employeId || undefined) : currentUserId,
    };

    if (mode === 'existing') {
      if (!selectedClient) { setError('Sélectionnez un client inscrit.'); return; }
      payload.clientUserId = selectedClient._id;
      payload.clientNom   = `${selectedClient.prenom} ${selectedClient.nom}`.trim();
      payload.clientEmail = selectedClient.email || '';
      payload.clientTel   = selectedClient.telephone || '';
    } else {
      if (!pPrenom.trim()) { setError('Le prénom du client est requis.'); return; }
      if (sendInvite && !pEmail.trim()) { setError('Un email est requis pour envoyer le lien de création de compte.'); return; }
      payload.clientNom   = `${pPrenom} ${pNom}`.trim();
      payload.clientTel   = pTel.trim();
      payload.clientEmail = pEmail.trim();
    }

    setSaving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === 'blackliste' ? 'Ce client est blacklisté.' : (data?.error || 'Erreur lors de la création.'));
        setSaving(false);
        return;
      }

      // Invitation à créer un compte (passager avec email)
      if (mode === 'passager' && sendInvite && pEmail.trim()) {
        await fetch('/api/account-invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pEmail.trim(), prenom: pPrenom.trim(), nom: pNom.trim(), telephone: pTel.trim() }),
        }).catch(() => {});
      }

      onCreated();
      onClose();
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaving(false);
    }
  };

  const categories = Array.from(new Set(prestations.map(p => p.categorie).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-body text-lg font-bold text-gray-900">Nouveau rendez-vous</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date / heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Heure</label>
              <select value={heure} onChange={e => setHeure(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400 bg-white">
                {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Coiffeur (admin uniquement) */}
          {isAdmin && (
            <div>
              <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">Coiffeur</label>
              <select value={employeId} onChange={e => setEmployeId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400 bg-white">
                <option value="">Attribution automatique</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.prenom} {s.nom}</option>)}
              </select>
            </div>
          )}

          {/* Prestations */}
          <div>
            <label className="font-body text-xs font-semibold text-gray-500 mb-1 block">
              Prestations <span className="text-gray-400 font-normal">({selectedPrest.length}/{MAX_PRESTATIONS})</span>
            </label>
            {selectedPrest.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedPrest.map(nom => (
                  <span key={nom} className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 pl-2.5 pr-1 py-1 rounded-full">
                    {nom}
                    <button onClick={() => togglePrest(nom)} className="hover:bg-yellow-200 rounded-full p-0.5"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            {selectedPrest.length < MAX_PRESTATIONS && (
              <div className="flex items-center gap-2">
                <Plus size={12} className="text-gray-400 flex-shrink-0" />
                <select value="" onChange={e => { if (e.target.value) togglePrest(e.target.value); }}
                  className="flex-1 text-xs font-body border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-yellow-400">
                  <option value="">Ajouter une prestation...</option>
                  {categories.map(cat => {
                    const items = prestations.filter(p => p.categorie === cat && !selectedPrest.includes(p.nom));
                    if (items.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat}>
                        {items.map(p => <option key={p._id} value={p.nom}>{p.nom} — {p.duree} · {p.prix}€</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Sélecteur de mode client */}
          <div>
            <label className="font-body text-xs font-semibold text-gray-500 mb-2 block">Client</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setMode('existing')}
                className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-colors
                  ${mode === 'existing' ? 'bg-yellow-400 text-gray-900 border-yellow-400' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}>
                <Search size={13} /> Client inscrit
              </button>
              <button type="button" onClick={() => setMode('passager')}
                className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-colors
                  ${mode === 'passager' ? 'bg-yellow-400 text-gray-900 border-yellow-400' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}>
                <UserPlus size={13} /> Passager
              </button>
            </div>

            {mode === 'existing' ? (
              <div>
                {selectedClient ? (
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-body text-sm font-medium text-gray-900">{selectedClient.prenom} {selectedClient.nom}</p>
                      <p className="font-body text-xs text-gray-500">{selectedClient.email || selectedClient.telephone || '—'}</p>
                    </div>
                    <button onClick={() => { setSelectedClient(null); setQ(''); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (nom, email, téléphone)..."
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
                    </div>
                    {searching && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Recherche...</p>}
                    {results.length > 0 && (
                      <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-44 overflow-y-auto">
                        {results.map(c => (
                          <button key={c._id} onClick={() => setSelectedClient(c)}
                            className="w-full text-left px-3 py-2 hover:bg-yellow-50 transition-colors">
                            <p className="font-body text-sm text-gray-900">{c.prenom} {c.nom}</p>
                            <p className="font-body text-xs text-gray-400">{c.email || c.telephone || '—'}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {q.trim().length >= 2 && !searching && results.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">Aucun client trouvé.</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={pPrenom} onChange={e => setPPrenom(e.target.value)} placeholder="Prénom *"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
                  <input value={pNom} onChange={e => setPNom(e.target.value)} placeholder="Nom"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
                </div>
                <input value={pTel} onChange={e => setPTel(e.target.value)} placeholder="Téléphone"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
                <input value={pEmail} onChange={e => setPEmail(e.target.value)} type="email" placeholder="Email (optionnel)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-yellow-400" />
                <label className="flex items-center gap-2 text-xs font-body text-gray-600 cursor-pointer pt-1">
                  <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)}
                    className="accent-yellow-500" />
                  <Mail size={13} className="text-gray-400" />
                  Envoyer un lien de création de compte par email
                </label>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2 font-body">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="font-body text-sm text-gray-400 hover:text-gray-600 px-4 py-2">Annuler</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 font-body text-sm font-semibold bg-yellow-400 text-gray-900 px-6 py-2.5 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Créer le RDV
          </button>
        </div>
      </div>
    </div>
  );
}
