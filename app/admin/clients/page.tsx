'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, User, Users, Loader2, ChevronLeft, Ban, ShieldCheck, Gift, Calendar, Scissors, Clock, Star } from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type FavPresta = { nom: string; count: number };

type Client = {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  blackliste?: boolean;
  autresPersonnes: { prenom: string; nom: string }[];
  derniereReservation: { date: string } | null;
  nbReservations: number;
  fidelite: { cycleCount: number; reservationsUntilReward: number; palier: number };
  prestationsFavorites: FavPresta[];
  frequenceMoyenneJours: number | null;
};

const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab,      setTab]      = useState<'actifs' | 'blacklistes'>('actifs');
  const [toggling, setToggling] = useState(false);

  // Toast d'erreur global (auto-disparition après 5 s)
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const PAGE_SIZE = 50;
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Chargement ─────────────────────────────────────────────────────────────
  const fetchClients = (q?: string, pageNum: number = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(pageNum));
    params.set('limit', String(PAGE_SIZE));

    fetch(`/api/clients?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setClients(d);
          setTotal(d.length);
        } else {
          setClients(Array.isArray(d?.clients) ? d.clients : []);
          setTotal(typeof d?.total === 'number' ? d.total : 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(search, page); /* eslint-disable-next-line */ }, [page]);

  // Recherche avec debounce : reset page 1 dès qu'on tape
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchClients(search, 1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ─── Filtrage par onglet ────────────────────────────────────────────────────
  const actifs      = useMemo(() => clients.filter(c => !c.blackliste), [clients]);
  const blacklistes = useMemo(() => clients.filter(c => c.blackliste),  [clients]);
  const displayed   = tab === 'actifs' ? actifs : blacklistes;

  // ─── Toggle blacklist ───────────────────────────────────────────────────────
  // L'ouverture de la modale est gérée par confirmToggle (UI), l'action serveur
  // est dans doToggleBlacklist (callback de la modale).
  const [pendingToggle, setPendingToggle] = useState<Client | null>(null);

  const confirmToggle = (client: Client) => setPendingToggle(client);

  const doToggleBlacklist = async () => {
    if (!pendingToggle) return;
    const client = pendingToggle;
    const newVal = !client.blackliste;
    const label = newVal ? 'blacklister' : 'débloquer';

    setToggling(true);
    try {
      const res = await fetch(`/api/clients/${client._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blackliste: newVal }),
      });
      if (res.ok) {
        setClients(prev => prev.map(c =>
          c._id === client._id ? { ...c, blackliste: newVal } : c
        ));
        if (selected?._id === client._id) {
          setSelected({ ...selected, blackliste: newVal });
        }
        setPendingToggle(null);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || `Impossible de ${label} ce client. Réessayez.`);
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setToggling(false);
    }
  };

  // Modale de confirmation partagée (fiche client + liste)
  const confirmModal = (
    <ConfirmModal
      open={!!pendingToggle}
      title={pendingToggle?.blackliste ? 'Débloquer ce client ?' : 'Blacklister ce client ?'}
      message={pendingToggle
        ? pendingToggle.blackliste
          ? `${pendingToggle.prenom} ${pendingToggle.nom} pourra à nouveau réserver en ligne.`
          : `${pendingToggle.prenom} ${pendingToggle.nom} ne pourra plus réserver en ligne tant qu'il sera blacklisté.`
        : null}
      confirmLabel={pendingToggle?.blackliste ? 'Débloquer' : 'Blacklister'}
      variant={pendingToggle?.blackliste ? 'default' : 'danger'}
      loading={toggling}
      onConfirm={doToggleBlacklist}
      onCancel={() => setPendingToggle(null)}
    />
  );

  // ─── Fiche client ───────────────────────────────────────────────────────────
  if (selected) {
    const c = selected;
    return (
      <div>
        {confirmModal}
        <button onClick={() => setSelected(null)}
          className="mb-6 flex items-center gap-2 font-body text-sm text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={14} /> Retour aux clients
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-body text-2xl font-bold text-gray-900">Fiche Client</h1>
          <button
            onClick={() => confirmToggle(c)}
            disabled={toggling}
            className={`flex items-center gap-2 font-body text-sm font-medium px-4 py-2 rounded-lg transition-colors
              ${c.blackliste
                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              } disabled:opacity-50`}
          >
            {c.blackliste
              ? <><ShieldCheck size={14} /> Débloquer</>
              : <><Ban size={14} /> Blacklister</>
            }
          </button>
        </div>

        {c.blackliste && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-6">
            <Ban size={14} className="text-red-500" />
            <span className="font-body text-sm text-red-700 font-medium">Client blacklisté — ne peut plus réserver en ligne</span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {/* Infos personnelles */}
          <div className="p-5 sm:p-8 flex items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-3">
              {[
                ['Prénom', c.prenom],
                ['Nom', c.nom],
                ['Téléphone', c.telephone || '—'],
                ['Email', c.email],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="font-body text-sm font-semibold text-gray-800 w-28">{label}</span>
                  <span className="font-body text-sm text-gray-600">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Réservations effectuées */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500">Réservations</p>
                  <p className="font-body text-lg font-bold text-gray-900">{c.nbReservations}</p>
                </div>
              </div>

              {/* Dernière visite */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500">Dernière visite</p>
                  <p className="font-body text-sm font-medium text-gray-900">
                    {c.derniereReservation ? formatDate(c.derniereReservation.date) : '—'}
                  </p>
                </div>
              </div>

              {/* Fréquence */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Star size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500">Fréquence</p>
                  <p className="font-body text-sm font-medium text-gray-900">
                    {c.frequenceMoyenneJours != null
                      ? c.frequenceMoyenneJours >= 7
                        ? `~${Math.round(c.frequenceMoyenneJours / 7)} semaine${Math.round(c.frequenceMoyenneJours / 7) > 1 ? 's' : ''}`
                        : `~${c.frequenceMoyenneJours} jour${c.frequenceMoyenneJours > 1 ? 's' : ''}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Fidélité */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                  <Gift size={16} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-body text-xs text-gray-500">Fidélité</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {Array.from({ length: c.fidelite.palier }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < c.fidelite.cycleCount ? 'bg-yellow-400' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="font-body text-[11px] text-gray-400 mt-1">
                    {c.fidelite.reservationsUntilReward === c.fidelite.palier
                      ? 'Cycle complété !'
                      : `${c.fidelite.reservationsUntilReward} RDV avant la prime`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prestations favorites */}
          {c.prestationsFavorites.length > 0 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Scissors size={16} className="text-gray-400" />
                <h2 className="font-body text-sm font-semibold text-gray-900">Prestations favorites</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.prestationsFavorites.map(f => (
                  <span key={f.nom} className="inline-flex items-center gap-1.5 font-body text-sm
                    bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-700">
                    {f.nom}
                    <span className="text-xs text-gray-400">×{f.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Autres personnes */}
          {c.autresPersonnes?.length > 0 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Users size={16} className="text-gray-400" />
                <h2 className="font-body text-sm font-semibold text-gray-900">Autres personnes rattachées</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.autresPersonnes.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 font-body text-sm
                    bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-700">
                    <User size={12} className="text-gray-400" />
                    {p.prenom} {p.nom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Liste des clients ──────────────────────────────────────────────────────
  return (
    <div>
      {confirmModal}
      {/* Toast d'erreur (auto-disparition) */}
      {actionError && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-red-600 text-white rounded-lg shadow-xl px-4 py-3 flex items-start gap-3">
          <span className="font-body text-sm flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            aria-label="Fermer"
            className="text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <h1 className="font-body text-2xl font-bold text-gray-900 mb-6">Clients</h1>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, prénom ou téléphone..."
          className="w-full pl-10 pr-4 py-2.5 font-body text-sm border border-gray-200 rounded-lg
            outline-none focus:border-yellow-400 bg-white transition-colors"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Onglets */}
        <div className="grid grid-cols-2 border-b border-gray-100">
          <button
            onClick={() => setTab('actifs')}
            className={`py-3.5 font-body text-sm font-medium transition-colors
              ${tab === 'actifs' ? 'text-gray-900 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Clients ({actifs.length})
          </button>
          <button
            onClick={() => setTab('blacklistes')}
            className={`py-3.5 font-body text-sm font-medium transition-colors
              ${tab === 'blacklistes' ? 'text-gray-900 border-b-2 border-red-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Blacklistés ({blacklistes.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-12 px-6">
            <Loader2 size={18} className="animate-spin" /> Chargement...
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-body text-sm text-gray-400">
              {tab === 'blacklistes' ? 'Aucun client blacklisté.' : 'Aucun client trouvé.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Client</th>
                <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Téléphone</th>
                <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Réservations</th>
                <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Dern. visite</th>
                <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Fidélité</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(c)}>
                  <td className="px-6 py-4">
                    <p className="font-body text-sm text-gray-900 font-medium">{c.prenom} {c.nom}</p>
                    <p className="font-body text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">{c.telephone || '—'}</td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">{c.nbReservations}</td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">
                    {c.derniereReservation ? formatDate(c.derniereReservation.date) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: c.fidelite.palier }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < c.fidelite.cycleCount ? 'bg-yellow-400' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => confirmToggle(c)}
                      disabled={toggling}
                      title={c.blackliste ? 'Débloquer' : 'Blacklister'}
                      className={`transition-colors disabled:opacity-50
                        ${c.blackliste
                          ? 'text-green-400 hover:text-green-600'
                          : 'text-gray-300 hover:text-red-400'
                        }`}
                    >
                      {c.blackliste ? <ShieldCheck size={16} /> : <Ban size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="font-body text-xs text-gray-500">
              Page <span className="font-semibold text-gray-700">{page}</span> sur{' '}
              <span className="font-semibold text-gray-700">{totalPages}</span> ·{' '}
              {total} client{total > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="font-body text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="font-body text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
