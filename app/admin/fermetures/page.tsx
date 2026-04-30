'use client';

import { useState, useEffect } from 'react';
<<<<<<< HEAD
import { ChevronLeft, ChevronRight, Loader2, X, AlertTriangle } from 'lucide-react';
=======
import { ChevronLeft, ChevronRight, Loader2, X, Plus } from 'lucide-react';
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272

type ClosedDay = { _id: string; date: string; motif: string };

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthStr(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

<<<<<<< HEAD
function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return `${jours[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
export default function AdminFermeturesPage() {
  const today = toDateStr(new Date());

  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading]       = useState(true);
<<<<<<< HEAD

  // Modal de confirmation
  const [modalDate, setModalDate]     = useState<string | null>(null);
  const [modalMotif, setModalMotif]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [modalError, setModalError]   = useState('');
=======
  const [motif, setMotif]           = useState('');
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272

  // Charger les fermetures du mois
  useEffect(() => {
    setLoading(true);
    const monthStr = toMonthStr(calMonth.year, calMonth.month);
    fetch(`/api/closed-days?month=${monthStr}`)
      .then(r => r.json())
      .then(d => setClosedDays(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [calMonth]);

  const closedSet = new Set(closedDays.map(d => toDateStr(new Date(d.date))));

<<<<<<< HEAD
  // Ouvrir la modale de confirmation pour fermer un jour
  const handleDayClick = (dateStr: string) => {
    if (closedSet.has(dateStr)) return; // déjà fermé, on ne fait rien ici
    setModalDate(dateStr);
    setModalMotif('');
    setModalError('');
  };

  // Confirmer la fermeture
  const confirmClose = async () => {
    if (!modalDate) return;
    if (!modalMotif.trim()) {
      setModalError('Veuillez saisir un motif de fermeture.');
      return;
    }
    setSubmitting(true);
    setModalError('');
=======
  const toggleDay = async (dateStr: string) => {
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    try {
      const res = await fetch('/api/closed-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
<<<<<<< HEAD
        body: JSON.stringify({ date: modalDate, motif: modalMotif.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Erreur lors de la fermeture.');
        return;
      }
      setClosedDays(prev => [...prev, data]);
      setModalDate(null);
    } catch (err) {
      console.error(err);
      setModalError('Erreur réseau.');
    } finally {
      setSubmitting(false);
    }
  };

  // Réouvrir un jour
  const reopenDay = async (dateStr: string) => {
    try {
      const res = await fetch('/api/closed-days', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      if (res.ok) {
        setClosedDays(prev => prev.filter(d => toDateStr(new Date(d.date)) !== dateStr));
=======
        body: JSON.stringify({ date: dateStr, motif }),
      });
      const data = await res.json();
      if (data.removed) {
        setClosedDays(prev => prev.filter(d => toDateStr(new Date(d.date)) !== dateStr));
      } else {
        setClosedDays(prev => [...prev, data]);
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
      }
    } catch (err) {
      console.error(err);
    }
  };

  const prevMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

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
      const isClosed = closedSet.has(dateStr);
      const isToday  = dateStr === today;
      const isPast   = dateStr < today;

      cells.push(
        <button
          key={d}
<<<<<<< HEAD
          onClick={() => isClosed ? undefined : handleDayClick(dateStr)}
          className={`relative w-12 h-12 rounded-lg text-sm font-body transition-colors
            ${isClosed
              ? 'bg-red-100 text-red-700 font-bold border-2 border-red-300 cursor-default'
              : isToday
                ? 'ring-2 ring-yellow-400 text-gray-900 font-semibold hover:bg-gray-100 cursor-pointer'
                : isPast
                  ? 'text-gray-300 cursor-pointer'
                  : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
=======
          onClick={() => toggleDay(dateStr)}
          className={`relative w-12 h-12 rounded-lg text-sm font-body transition-colors
            ${isClosed
              ? 'bg-red-100 text-red-700 font-bold border-2 border-red-300'
              : isToday
                ? 'ring-2 ring-yellow-400 text-gray-900 font-semibold hover:bg-gray-100'
                : isPast
                  ? 'text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100'
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
            }`}
        >
          {d}
          {isClosed && (
            <X size={8} className="absolute top-1 right-1 text-red-400" />
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="font-body text-base font-semibold text-gray-900">
            {MOIS[month]} {year}
          </span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center mb-3">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
            <div key={j} className="text-[11px] text-gray-400 font-body font-semibold">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 justify-items-center">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-body text-2xl font-bold text-gray-900 mb-2">Jours de fermeture</h1>
      <p className="font-body text-sm text-gray-400 mb-6">
<<<<<<< HEAD
        Cliquez sur un jour pour le marquer comme fermé. Les rendez-vous existants seront automatiquement annulés et les clients notifiés par e-mail.
      </p>

=======
        Cliquez sur un jour pour le marquer comme fermé (ou le réouvrir). Les créneaux seront automatiquement indisponibles.
      </p>

      {/* Motif */}
      <div className="mb-6">
        <label className="font-body text-xs text-gray-500 mb-1.5 block">Motif (optionnel)</label>
        <input
          value={motif}
          onChange={e => setMotif(e.target.value)}
          placeholder="Ex: Jour férié, Congés, Inventaire..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 font-body text-sm
            focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
        />
      </div>

>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Calendrier */}
          <div>{renderCalendar()}</div>

          {/* Liste des fermetures du mois */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-body text-sm font-semibold text-gray-900 mb-4">
              Fermetures — {MOIS[calMonth.month]}
            </h2>
            {closedDays.length === 0 ? (
              <p className="font-body text-xs text-gray-400">Aucune fermeture ce mois-ci.</p>
            ) : (
              <div className="space-y-2">
                {closedDays
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(day => {
                    const d = new Date(day.date);
                    const jourSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
                    return (
                      <div key={day._id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-body text-sm font-medium text-red-800">
                            {jourSemaine} {d.getDate()} {MOIS[d.getMonth()]}
                          </span>
                          {day.motif && (
                            <span className="font-body text-xs text-red-500 ml-2">— {day.motif}</span>
                          )}
                        </div>
                        <button
<<<<<<< HEAD
                          onClick={() => reopenDay(toDateStr(d))}
=======
                          onClick={() => toggleDay(toDateStr(d))}
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
                          className="text-red-300 hover:text-red-500 transition-colors"
                          title="Réouvrir"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
<<<<<<< HEAD

      {/* ── Modale de confirmation de fermeture ── */}
      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !submitting && setModalDate(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}>

            {/* Icone + titre */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-body text-lg font-bold text-gray-900">Confirmer la fermeture</h3>
                <p className="font-body text-sm text-gray-500">{formatDateFr(modalDate)}</p>
              </div>
            </div>

            <p className="font-body text-sm text-gray-600 mb-4">
              Tous les rendez-vous prévus ce jour seront <strong className="text-red-600">annulés</strong> et
              les clients recevront un e-mail d&apos;annulation avec le motif indiqué.
            </p>

            {/* Motif (obligatoire) */}
            <label className="font-body text-xs text-gray-500 mb-1.5 block font-semibold">
              Motif de fermeture <span className="text-red-500">*</span>
            </label>
            <textarea
              value={modalMotif}
              onChange={e => { setModalMotif(e.target.value); setModalError(''); }}
              placeholder="Ex: Jour férié, Congés annuels, Inventaire..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm mb-1
                focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              autoFocus
            />
            {modalError && (
              <p className="font-body text-xs text-red-500 mb-3">{modalError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setModalDate(null)}
                disabled={submitting}
                className="font-body text-sm text-gray-500 hover:text-gray-800 px-4 py-2 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmClose}
                disabled={submitting}
                className="flex items-center gap-2 bg-red-500 text-white font-body text-sm font-semibold
                  px-5 py-2.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirmer la fermeture
              </button>
            </div>
          </div>
        </div>
      )}
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    </div>
  );
}
