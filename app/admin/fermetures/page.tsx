'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X, Plus } from 'lucide-react';

type ClosedDay = { _id: string; date: string; motif: string };

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthStr(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default function AdminFermeturesPage() {
  const today = toDateStr(new Date());

  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading]       = useState(true);
  const [motif, setMotif]           = useState('');

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

  const toggleDay = async (dateStr: string) => {
    try {
      const res = await fetch('/api/closed-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, motif }),
      });
      const data = await res.json();
      if (data.removed) {
        setClosedDays(prev => prev.filter(d => toDateStr(new Date(d.date)) !== dateStr));
      } else {
        setClosedDays(prev => [...prev, data]);
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
          onClick={() => toggleDay(dateStr)}
          className={`relative w-12 h-12 rounded-lg text-sm font-body transition-colors
            ${isClosed
              ? 'bg-red-100 text-red-700 font-bold border-2 border-red-300'
              : isToday
                ? 'ring-2 ring-yellow-400 text-gray-900 font-semibold hover:bg-gray-100'
                : isPast
                  ? 'text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100'
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
                          onClick={() => toggleDay(toDateStr(d))}
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
    </div>
  );
}
