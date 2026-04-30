'use client';

import { useState, useEffect, useMemo } from 'react';
import CompteNav from '@/components/public/CompteNav';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Pencil, ChevronLeft, ChevronRight, X, Scissors, Gift } from 'lucide-react';

type Achat = { nom: string; prix: number; quantite: number; livre?: boolean };

type Rdv = {
  _id: string;
  numero: string;
  clientNom: string;
  pourQui?: string;
  prestations: string[];
  dureeMinutes: number;
  date: string;
  statut: 'a-venir' | 'termine' | 'annule' | 'absent';
  employeId?: string | null;
  achats?: Achat[];
  prestationValidee?: boolean;
  fideliteReductionEur?: number;
};

type StaffMember = { _id: string; prenom: string; nom: string };
type Slot = { heure: string; disponible: boolean };

type FidelitePersonne = {
  pourQui:                 string;
  label:                   string;
  totalValidees:           number;
  cycleCount:              number;
  reservationsUntilReward: number;
  palier:                  number;
  rewardEur:               number;
};

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MOIS_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} — ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
}

/** RDV considéré comme passé : heure du RDV + 1h < maintenant */
function isPast(iso: string): boolean {
  return new Date(iso).getTime() + 60 * 60 * 1000 < Date.now();
}

type Tab = 'a-venir' | 'historique';

export default function MesReservationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [rdvs,      setRdvs]     = useState<Rdv[]>([]);
  const [staff,     setStaff]    = useState<StaffMember[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [fidelitePersonnes, setFidelitePersonnes] = useState<FidelitePersonne[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editRdv,   setEditRdv]   = useState<Rdv | null>(null);
  const [tab,       setTab]       = useState<Tab>('a-venir');

  // ─── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      fetch('/api/reservations?view=client').then(r => r.json()),
      fetch('/api/staff').then(r => r.json()),
      fetch('/api/fidelite').then(r => r.json()),
    ])
      .then(([rdvData, staffData, fideliteData]) => {
        setRdvs(Array.isArray(rdvData) ? rdvData : []);
        setStaff(Array.isArray(staffData) ? staffData : []);
        if (fideliteData?.personnes && Array.isArray(fideliteData.personnes)) {
          setFidelitePersonnes(fideliteData.personnes);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, user?.id]);

  const supprimer = async (id: string) => {
    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRdvs(prev => prev.filter(r => r._id !== id));
    }
    setConfirmId(null);
  };

  const getCoiffeurName = (id?: string | null): string => {
    if (!id) return 'Non assigné';
    const s = staff.find(x => x._id === id);
    return s ? `${s.prenom} ${s.nom}`.trim() : '—';
  };

  const rdvToConfirm = confirmId ? rdvs.find(r => r._id === confirmId) : null;

  // ─── Répartition par onglet ───────────────────────────────────────────────
  // À venir : statut 'a-venir' non passé et non validé
  // Historique : passés, validés (payés) ou annulés
  const rdvsAVenir = useMemo(() => {
    return rdvs
      .filter(r => r.statut === 'a-venir' && !isPast(r.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rdvs]);

  const rdvsHistorique = useMemo(() => {
    return rdvs
      .filter(r => r.statut !== 'a-venir' || isPast(r.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rdvs]);

  const displayedRdvs = tab === 'a-venir' ? rdvsAVenir : rdvsHistorique;

  return (
    <div>
      <CompteNav />
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] uppercase text-white mb-6">Mes réservations</h1>

      {/* ── Cartes fidélité par personne ─────────────────────────────────── */}
      {fidelitePersonnes.length > 0 && (
        <div className="mb-6 space-y-3">
          {fidelitePersonnes.map(fp => {
            const rewardReady = fp.cycleCount === 0 && fp.totalValidees > 0;
            return (
              <div key={fp.pourQui}
                className="rounded-lg border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-yellow-400/[0.02] p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-yellow-400" />
                    <span className="font-display text-xs tracking-[0.2em] uppercase text-yellow-400 font-bold">
                      {fp.label}
                    </span>
                  </div>
                  <span className="font-body text-[11px] text-white/50">
                    {rewardReady
                      ? `Prime de ${fp.rewardEur} € disponible sur le prochain RDV`
                      : `Plus que ${fp.reservationsUntilReward} RDV${fp.reservationsUntilReward > 1 ? 's' : ''} avant ${fp.rewardEur} € offerts`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {Array.from({ length: fp.palier }).map((_, i) => {
                    const filled = i < fp.cycleCount;
                    const isReward = i === fp.palier - 1;
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-full transition-colors
                          ${filled
                            ? 'bg-yellow-400'
                            : isReward
                              ? 'bg-white/10 border border-yellow-400/40'
                              : 'bg-white/10'}`}
                        title={isReward ? `Récompense : ${fp.rewardEur} €` : `RDV ${i + 1}`}
                      />
                    );
                  })}
                </div>

                <p className="font-body text-[11px] text-white/40 mt-3">
                  {fp.totalValidees} prestation{fp.totalValidees > 1 ? 's' : ''} validée{fp.totalValidees > 1 ? 's' : ''} ·
                  1 RDV offert toutes les {fp.palier} prestations
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Onglets À venir / Historique */}
      <div className="flex items-center gap-1 mb-4 border-b border-white/10">
        {([
          { id: 'a-venir',    label: 'À venir',            count: rdvsAVenir.length },
          { id: 'historique', label: 'Passées & payées',   count: rdvsHistorique.length },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`font-display text-xs tracking-[0.15em] uppercase px-5 py-3 transition-colors border-b-2 -mb-px
              ${tab === t.id
                ? 'text-yellow-400 border-yellow-400'
                : 'text-white/40 hover:text-white/70 border-transparent'}`}
          >
            {t.label}
            <span className={`ml-2 font-body text-[10px] px-1.5 py-0.5 rounded
              ${tab === t.id ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/10 text-white/50'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-48 gap-2 text-white/60">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      ) : (
        <div className="bg-white rounded-lg divide-y divide-gray-100">
          {displayedRdvs.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-body text-gray-400 text-sm">
                {tab === 'a-venir'
                  ? 'Aucune réservation à venir.'
                  : 'Aucune réservation dans l\'historique.'}
              </p>
            </div>
          )}
          {displayedRdvs.map(rdv => {
            const past = isPast(rdv.date);
            const isAVenir = rdv.statut === 'a-venir' && !past;
            return (
              <div key={rdv._id}
                className={`p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4
                  ${past ? 'bg-gray-50 opacity-70' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[10px] uppercase tracking-widest text-yellow-600 font-bold mb-1">
                    N° {rdv.numero}
                  </p>
                  <p className="font-body text-sm">
                    <span className="font-semibold text-gray-800">Pour : </span>
                    <span className="text-gray-600">
                      {rdv.pourQui && rdv.pourQui !== 'moi' ? rdv.pourQui : rdv.clientNom}
                    </span>
                  </p>
                  <p className="font-body text-sm mt-1">
                    <span className="font-semibold text-gray-800">Prestations : </span>
                    <span className="text-gray-600">{rdv.prestations.join(', ')}</span>
                  </p>
                  <p className="font-body text-sm mt-1">
                    <span className="font-semibold text-gray-800">Date et heure : </span>
                    <span className="text-gray-600">{formatDate(rdv.date)}</span>
                  </p>
                  <p className="font-body text-sm mt-1 flex items-center gap-1.5">
                    <Scissors size={12} className="text-yellow-600" />
                    <span className="font-semibold text-gray-800">Coiffeur : </span>
                    <span className="text-gray-600">{getCoiffeurName(rdv.employeId)}</span>
                  </p>

                  {/* Produits réservés (non livrés uniquement) */}
                  {rdv.achats && rdv.achats.filter(a => !a.livre).length > 0 && (
                    <div className="mt-2">
                      <p className="font-body text-xs text-gray-500 font-semibold">Produits à récupérer :</p>
                      <ul className="font-body text-xs text-gray-500 list-disc list-inside">
                        {rdv.achats.filter(a => !a.livre).map((a, i) => (
                          <li key={i}>{a.nom} × {a.quantite}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                  {isAVenir && (
                    <>
                      <button
                        onClick={() => setEditRdv(rdv)}
                        className="font-body text-xs flex items-center gap-1.5 text-gray-600 hover:text-yellow-600 transition-colors"
                      >
                        <Pencil size={12} /> Modifier
                      </button>
                      <button onClick={() => setConfirmId(rdv._id)} className="btn-gold-outline text-xs px-5 py-2">
                        Annuler le rendez-vous
                      </button>
                    </>
                  )}
                  {rdv.prestationValidee && (
                    <span className="inline-block bg-green-50 text-green-600 font-display text-xs tracking-wider uppercase px-5 py-2 rounded-full">
                      Terminée
                    </span>
                  )}
                  {(rdv.fideliteReductionEur ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 font-display text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                      <Gift size={10} /> -{rdv.fideliteReductionEur} € fidélité
                    </span>
                  )}
                  {past && !rdv.prestationValidee && rdv.statut !== 'annule' && (
                    <span className="inline-block bg-gray-200 text-gray-500 font-display text-xs tracking-wider uppercase px-5 py-2 rounded-full">
                      Passé
                    </span>
                  )}
                  {rdv.statut === 'annule' && (
                    <span className="inline-block bg-red-50 text-red-400 font-display text-xs tracking-wider uppercase px-5 py-2 rounded-full">
                      Annulé
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale de confirmation d'annulation */}
      {rdvToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
            <h2 className="font-display text-base font-bold tracking-[0.1em] uppercase text-gray-900 mb-4">
              Confirmer l'annulation
            </h2>
            <p className="font-body text-sm text-gray-600 mb-2">
              Souhaitez-vous vraiment annuler cette réservation ?
            </p>
            <div className="font-body text-sm text-gray-500 bg-gray-50 rounded p-3 mb-6">
              <p><span className="font-semibold text-gray-700">Prestations :</span> {rdvToConfirm.prestations.join(', ')}</p>
              <p className="mt-1"><span className="font-semibold text-gray-700">Date :</span> {formatDate(rdvToConfirm.date)}</p>
            </div>
            <p className="font-body text-xs text-red-400 mb-6">
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmId(null)}
                className="btn-gold-outline text-xs px-5 py-2">
                Retour
              </button>
              <button onClick={() => supprimer(rdvToConfirm._id)}
                className="font-display text-xs tracking-[0.15em] uppercase px-5 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'édition de date/heure */}
      {editRdv && (
        <EditRdvModal
          rdv={editRdv}
          onClose={() => setEditRdv(null)}
          onSaved={updated => {
            setRdvs(prev => prev.map(r => r._id === updated._id ? { ...r, ...updated } : r));
            setEditRdv(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Sous-composant : modale de modification ─────────────────────────────────

function EditRdvModal({
  rdv, onClose, onSaved,
}: {
  rdv: Rdv;
  onClose: () => void;
  onSaved: (rdv: Rdv) => void;
}) {
  const initial = new Date(rdv.date);
  const [calMonth, setCalMonth] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [selectedDate, setSelectedDate] = useState(toDateStr(initial));
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [slots, setSlots]   = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const today = toDateStr(new Date());

  useEffect(() => {
    setLoading(true);
    setSelectedHour(null);
    const params = new URLSearchParams({
      date:         selectedDate,
      dureeMinutes: String(rdv.dureeMinutes ?? 30),
      excludeRdvId: rdv._id,
    });
    if (rdv.employeId) params.set('employeId', rdv.employeId);

    fetch(`/api/slots?${params}`)
      .then(r => r.json())
      .then(d => setSlots(Array.isArray(d.slots) ? d.slots : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate, rdv._id, rdv.dureeMinutes, rdv.employeId]);

  const prevMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const submit = async () => {
    if (!selectedHour) return;
    setSaving(true);
    setError('');

    const [h, m] = selectedHour.split(':').map(Number);
    const newDate = new Date(selectedDate + 'T00:00:00');
    newDate.setHours(h, m, 0, 0);

    try {
      const res = await fetch(`/api/reservations/${rdv._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: newDate.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur');
      } else {
        onSaved(data);
      }
    } catch {
      setError('Erreur réseau.');
    }
    setSaving(false);
  };

  // ─── Calendrier ──────────────────────────────────────────────────────────
  const renderCalendar = () => {
    const { year, month } = calMonth;
    const firstDay  = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();

    const cells: React.ReactNode[] = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`e${i}`} />);
    }

    for (let d = 1; d <= daysCount; d++) {
      const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSel    = dateStr === selectedDate;
      const isPastD  = dateStr < today;

      cells.push(
        <button
          key={d}
          disabled={isPastD}
          onClick={() => setSelectedDate(dateStr)}
          className={`w-9 h-9 rounded-full text-sm font-body transition-colors
            ${isSel
              ? 'bg-yellow-400 text-gray-900 font-bold'
              : isPastD
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          {d}
        </button>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700">
            <ChevronLeft size={18} />
          </button>
          <span className="font-body text-sm font-semibold text-gray-900">
            {MOIS_LONG[month]} {year}
          </span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(j => (
            <div key={j} className="text-[10px] text-gray-400 font-body font-semibold">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-body text-base font-semibold text-gray-900">Modifier le rendez-vous</h3>
            <p className="font-body text-xs text-gray-400 mt-0.5">#{rdv.numero} · {rdv.prestations.join(', ')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {renderCalendar()}

          <div>
            <p className="font-body text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Créneau disponible
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <Loader2 size={14} className="animate-spin" /> Chargement...
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(s => (
                  <button
                    key={s.heure}
                    disabled={!s.disponible}
                    onClick={() => setSelectedHour(s.heure)}
                    className={`font-body text-xs py-2 rounded-lg border transition-colors
                      ${selectedHour === s.heure
                        ? 'bg-yellow-400 border-yellow-400 text-gray-900 font-semibold'
                        : s.disponible
                          ? 'border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                  >
                    {s.heure}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="font-body text-xs text-red-500 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="font-body text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!selectedHour || saving}
            className="font-body text-sm font-medium bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg
              hover:bg-yellow-500 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
