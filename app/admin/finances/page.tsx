'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Loader2, TrendingUp, Target, CalendarDays, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, Pencil, Users, Download,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type RdvLite = {
  _id:                  string;
  numero:               string;
  clientNom:            string;
  date:                 string;
  prestations:          string[];
  dureeMinutes:         number;
  prestationValidee:    boolean;
  fideliteReductionEur: number;
  ca:                   number;
};

type FinancesStats = {
  employeId:       string;
  employeNom:      string;
  role:            string;
  month:           string;
  objectifMensuel: number;
  effectuees:      { count: number; ca: number; rdvs: RdvLite[] };
  aVenir:          { count: number; ca: number; rdvs: RdvLite[] };
  caTotal:         number;
};

type CoiffeurSummary = {
  employeId:       string;
  employeNom:      string;
  role:            string;
  objectifMensuel: number;
  caEffectuees:    number;
  countEffectuees: number;
  caAVenir:        number;
  countAVenir:     number;
  caTotal:         number;
};

type AllStats = {
  month:      string;
  totalSalon: number;
  coiffeurs:  CoiffeurSummary[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function currentMonthParam(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MOIS[m - 1]} ${y}`;
}

// UTC : aligne avec la date du RDV stockée comme heure murale du salon en UTC
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const mon   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins  = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}/${mon} ${hours}h${mins}`;
}

function formatEuros(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const userId  = user?.id;

  const [month, setMonth] = useState<string>(currentMonthParam());
  const [selectedEmployeId, setSelectedEmployeId] = useState<string>(''); // admin : choix dans la liste

  const [stats, setStats]        = useState<FinancesStats | null>(null);
  const [allStats, setAllStats]  = useState<AllStats | null>(null);
  const [loading, setLoading]    = useState(true);
  const [savingObj, setSavingObj] = useState(false);

  // Édition de l'objectif
  const [editingObjective, setEditingObjective] = useState(false);
  const [draftObjective, setDraftObjective]     = useState<string>('');

  // ─── Fetch stats individuelles ────────────────────────────────────────────
  // NB : on dépend uniquement de valeurs primitives stables (userId, isAdmin…),
  // jamais de l'objet `user` qui est recréé à chaque render par useAuth().
  useEffect(() => {
    if (authLoading || !userId) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ month });
    if (isAdmin && selectedEmployeId) {
      params.set('employeId', selectedEmployeId);
    }

    fetch(`/api/finances?${params.toString()}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setStats(ok ? data : null);
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authLoading, userId, isAdmin, selectedEmployeId, month]);

  // ─── Fetch overview admin ─────────────────────────────────────────────────
  const refreshAllStats = useCallback(() => {
    if (!isAdmin) return;
    fetch(`/api/finances/all?month=${month}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => setAllStats(ok ? data : null))
      .catch(err => { console.error(err); setAllStats(null); });
  }, [isAdmin, month]);

  useEffect(() => {
    if (!isAdmin) { setAllStats(null); return; }
    refreshAllStats();
  }, [isAdmin, month, refreshAllStats]);

  // ─── Barre de progression ─────────────────────────────────────────────────
  const progress = useMemo(() => {
    if (!stats || !stats.objectifMensuel) {
      return { pctEff: 0, pctAvenir: 0, reached: false };
    }
    const obj = stats.objectifMensuel;
    const pctEff    = Math.min(100, (stats.effectuees.ca / obj) * 100);
    const pctAvenir = Math.min(100 - pctEff, (stats.aVenir.ca / obj) * 100);
    return {
      pctEff,
      pctAvenir,
      reached: stats.caTotal >= obj,
    };
  }, [stats]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const saveObjective = async () => {
    const val = Number(draftObjective);
    if (!Number.isFinite(val) || val < 0) return;
    setSavingObj(true);
    try {
      const body: Record<string, unknown> = { objectifMensuel: val };
      if (isAdmin && stats?.employeId && stats.employeId !== user?.id) {
        body.employeId = stats.employeId;
      }
      const res = await fetch('/api/finances', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        setStats(prev => prev ? { ...prev, objectifMensuel: val } : prev);
        setEditingObjective(false);
        // On rafraîchit la vue globale admin pour garder l'objectif aligné
        if (isAdmin) refreshAllStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingObj(false);
    }
  };

  // ─── Export Excel ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/finances/export?month=${month}`);
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GoldCut_Prestations_${formatMonth(month).replace(' ', '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-12">
        <Loader2 size={18} className="animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-body text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={22} className="text-yellow-500" /> Finances
          </h1>
          <p className="font-body text-xs text-gray-500 mt-1">
            {isAdmin
              ? 'Suivi du chiffre d\'affaires par coiffeur et global au salon'
              : 'Votre chiffre d\'affaires mensuel et votre objectif'}
          </p>
        </div>

        {/* Sélecteur de mois + Export */}
        <div className="flex items-center gap-3">
        <button
          onClick={exportExcel}
          disabled={exporting || loading}
          className="flex items-center gap-2 font-body text-xs font-semibold
            bg-green-600 text-white px-4 py-2 rounded-lg
            hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Exporter Excel
        </button>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
          <button
            onClick={() => setMonth(m => shiftMonth(m, -1))}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-body text-sm font-medium text-gray-800 min-w-[130px] text-center">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => setMonth(m => shiftMonth(m, +1))}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
          {month !== currentMonthParam() && (
            <button
              onClick={() => setMonth(currentMonthParam())}
              className="font-body text-[10px] text-yellow-600 hover:text-yellow-700 px-2"
            >
              Ce mois
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Sélecteur d'employé (admin) */}
      {isAdmin && allStats && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-gray-400" />
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-500">
              Vue par coiffeur
            </span>
            <span className="ml-auto font-body text-xs text-gray-500">
              Total salon :{' '}
              <strong className="text-gray-900">{formatEuros(allStats.totalSalon)}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedEmployeId('')}
              className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors
                ${selectedEmployeId === ''
                  ? 'bg-yellow-400 text-gray-900 border-yellow-400 font-semibold'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
            >
              Moi
            </button>
            {allStats.coiffeurs.map(c => (
              <button
                key={c.employeId}
                onClick={() => setSelectedEmployeId(c.employeId)}
                className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${selectedEmployeId === c.employeId
                    ? 'bg-yellow-400 text-gray-900 border-yellow-400 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
              >
                {c.employeNom || '—'}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {formatEuros(c.caTotal)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 size={18} className="animate-spin" /> Chargement des stats...
        </div>
      ) : !stats ? (
        <p className="font-body text-sm text-gray-400">Aucune donnée disponible.</p>
      ) : (
        <>
          {/* Cartes CA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="font-body text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                  CA effectué
                </span>
              </div>
              <p className="font-body text-2xl font-bold text-gray-900">
                {formatEuros(stats.effectuees.ca)}
              </p>
              <p className="font-body text-xs text-gray-400 mt-1">
                {stats.effectuees.count} prestation{stats.effectuees.count > 1 ? 's' : ''} validée{stats.effectuees.count > 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-blue-500" />
                <span className="font-body text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                  CA à venir
                </span>
              </div>
              <p className="font-body text-2xl font-bold text-gray-900">
                {formatEuros(stats.aVenir.ca)}
              </p>
              <p className="font-body text-xs text-gray-400 mt-1">
                {stats.aVenir.count} RDV à venir
              </p>
            </div>

            <div className="bg-white rounded-lg border border-yellow-300 p-5 bg-gradient-to-br from-yellow-50 to-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-yellow-600" />
                <span className="font-body text-[10px] uppercase tracking-wider font-semibold text-yellow-700">
                  CA total ({formatMonth(stats.month)})
                </span>
              </div>
              <p className="font-body text-2xl font-bold text-gray-900">
                {formatEuros(stats.caTotal)}
              </p>
              <p className="font-body text-xs text-yellow-700 mt-1">
                effectué + à venir
              </p>
            </div>
          </div>

          {/* Barre d'objectif */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-yellow-500" />
                <span className="font-body text-sm font-semibold text-gray-900">
                  Objectif mensuel
                </span>
                {stats.employeId !== user?.id && (
                  <span className="font-body text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {stats.employeNom}
                  </span>
                )}
              </div>

              {editingObjective ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={draftObjective}
                    onChange={e => setDraftObjective(e.target.value)}
                    className="font-body text-sm border border-gray-300 rounded px-2 py-1 w-28 outline-none focus:border-yellow-400"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="font-body text-sm text-gray-500">€</span>
                  <button
                    onClick={saveObjective}
                    disabled={savingObj}
                    className="font-body text-xs font-semibold bg-yellow-400 text-gray-900 px-3 py-1.5 rounded
                      hover:bg-yellow-500 transition-colors disabled:opacity-50"
                  >
                    {savingObj ? <Loader2 size={12} className="animate-spin" /> : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditingObjective(false)}
                    disabled={savingObj}
                    className="font-body text-xs text-gray-400 hover:text-gray-600 px-2"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-bold text-gray-900">
                    {stats.objectifMensuel > 0 ? formatEuros(stats.objectifMensuel) : 'Non fixé'}
                  </span>
                  <button
                    onClick={() => {
                      setDraftObjective(String(stats.objectifMensuel || ''));
                      setEditingObjective(true);
                    }}
                    className="text-gray-400 hover:text-yellow-600 transition-colors"
                    title="Modifier l'objectif"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>

            {stats.objectifMensuel > 0 ? (
              <>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  {/* CA effectué (plein) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-green-500 transition-all"
                    style={{ width: `${progress.pctEff}%` }}
                  />
                  {/* CA à venir (hachuré) */}
                  <div
                    className="absolute top-0 h-full bg-blue-400/70 transition-all"
                    style={{
                      left:  `${progress.pctEff}%`,
                      width: `${progress.pctAvenir}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs font-body">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-green-700">
                      <span className="w-2 h-2 bg-green-500 rounded-sm" /> Effectué
                    </span>
                    <span className="flex items-center gap-1 text-blue-700">
                      <span className="w-2 h-2 bg-blue-400 rounded-sm" /> À venir
                    </span>
                  </div>
                  <span className={`font-semibold ${progress.reached ? 'text-green-700' : 'text-gray-600'}`}>
                    {formatEuros(stats.caTotal)} / {formatEuros(stats.objectifMensuel)}
                    {progress.reached && ' — Objectif atteint 🎯'}
                  </span>
                </div>
              </>
            ) : (
              <p className="font-body text-xs text-gray-400 italic">
                Fixez un objectif pour visualiser votre progression.
              </p>
            )}
          </div>

          {/* Listes RDV */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* À venir */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Prestations à venir
                </span>
                <span className="ml-auto font-body text-xs text-gray-400">
                  {stats.aVenir.count}
                </span>
              </div>
              {stats.aVenir.rdvs.length === 0 ? (
                <p className="font-body text-xs text-gray-400 italic p-4">
                  Aucune prestation à venir ce mois.
                </p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {stats.aVenir.rdvs.map(r => (
                    <li key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-gray-900 truncate">
                          {r.clientNom}
                        </p>
                        <p className="font-body text-[11px] text-gray-400 truncate">
                          <CalendarDays size={10} className="inline mr-1" />
                          {formatDateTime(r.date)} · {r.prestations.join(', ')}
                        </p>
                      </div>
                      <span className="font-body text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatEuros(r.ca)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Effectuées */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Prestations effectuées
                </span>
                <span className="ml-auto font-body text-xs text-gray-400">
                  {stats.effectuees.count}
                </span>
              </div>
              {stats.effectuees.rdvs.length === 0 ? (
                <p className="font-body text-xs text-gray-400 italic p-4">
                  Aucune prestation effectuée ce mois.
                </p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {stats.effectuees.rdvs.map(r => (
                    <li key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-gray-900 truncate">
                          {r.clientNom}
                        </p>
                        <p className="font-body text-[11px] text-gray-400 truncate">
                          <CalendarDays size={10} className="inline mr-1" />
                          {formatDateTime(r.date)} · {r.prestations.join(', ')}
                          {r.fideliteReductionEur > 0 && ` · -${r.fideliteReductionEur} € fidélité`}
                        </p>
                      </div>
                      <span className="font-body text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatEuros(r.ca)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Tableau récap admin */}
          {isAdmin && allStats && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Users size={14} className="text-gray-400" />
                <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Récapitulatif salon — {formatMonth(allStats.month)}
                </span>
                <span className="ml-auto font-body text-xs font-bold text-gray-900">
                  {formatEuros(allStats.totalSalon)}
                </span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left font-body text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">Coiffeur</th>
                    <th className="px-4 py-2 text-right">Effectué</th>
                    <th className="px-4 py-2 text-right">À venir</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Objectif</th>
                    <th className="px-4 py-2 text-right">Atteinte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allStats.coiffeurs.map(c => {
                    const pct = c.objectifMensuel > 0
                      ? Math.round((c.caTotal / c.objectifMensuel) * 100)
                      : null;
                    return (
                      <tr key={c.employeId} className="font-body text-sm">
                        <td className="px-4 py-2 text-gray-900">
                          {c.employeNom || '—'}
                          {c.role === 'admin' && (
                            <span className="ml-1.5 text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">{formatEuros(c.caEffectuees)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{formatEuros(c.caAVenir)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatEuros(c.caTotal)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {c.objectifMensuel > 0 ? formatEuros(c.objectifMensuel) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {pct === null ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className={pct >= 100 ? 'text-green-700 font-semibold' : 'text-gray-600'}>
                              {pct}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
