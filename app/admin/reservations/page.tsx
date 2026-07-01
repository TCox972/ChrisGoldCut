'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Lock, Unlock,
  Trash2, X, Clock, AlertTriangle, Eye, CalendarDays,
  CalendarRange, CheckSquare, Square, ChevronDown, Check, Package,
  Edit3, Plus, Gift, UserX, Mail,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import ConfirmModal from '@/components/admin/ConfirmModal';
import NewReservationModal from '@/components/admin/NewReservationModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type Achat = { nom: string; prix: number; quantite: number; livre?: boolean };

type Rdv = {
  _id: string; numero: string;
  clientNom: string; clientEmail: string; clientTel: string;
  date: string; prestations: string[]; dureeMinutes: number;
  statut: string; employeId?: string;
  achats: Achat[]; totalAchats: number;
  retardSignale?: boolean;
  prestationValidee?: boolean;
  fideliteReductionEur?: number;
  createdAt: string;
};

type FidelitePersonne = {
  label:                   string;
  totalValidees:           number;
  cycleCount:              number;
  reservationsUntilReward: number;
  palier:                  number;
  rewardPercent:           number;
};
type Fidelite = FidelitePersonne;

type BlockedDay = { date: string; heures: string[]; adminHeures?: string[]; employeId?: string | null };
type StaffMember = { _id: string; prenom: string; nom: string; role: string };
type ViewMode = 'day' | 'week';

type CommandeArticle = {
  produitId: string; nom: string; description?: string; image?: string;
  prix: number; quantite: number; livre?: boolean;
};
type Commande = {
  _id: string; numero: string; clientEmail: string;
  articles: CommandeArticle[];
  total: number; statut: 'en-attente' | 'annulee'; createdAt: string;
};

type PrestationItem = {
  _id: string;
  categorie: string;
  nom: string;
  duree: string;
  prix: number;
};

const MAX_PRESTATIONS_PAR_RDV = 3;

// ─── Constantes ──────────────────────────────────────────────────────────────

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const ALL_SLOTS = (() => {
  const s: string[] = [];
  for (let m = 9 * 60; m < 19 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    s.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return s;
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

// IMPORTANT : on lit les composants en UTC pour aligner avec le stockage serveur
// (les dates de blocage/RDV sont persistées comme "heure murale" en UTC).
// Avec des accesseurs locaux, un blocage du 20/06 stocké à `2026-06-20T00:00Z`
// serait lu comme "19 juin" dans un navigateur en UTC-4 → la clé ne matcherait
// jamais et le slot bloqué disparaîtrait visuellement.
function toDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function toMonthStr(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function slotsNeeded(duree: number): number {
  return Math.ceil(duree / 30);
}

/** Retourne les dates Lun-Sam de la semaine contenant `dateStr` */
function getWeekDates(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=dim, 1=lun...6=sam
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 6; i++) { // Lun-Sam
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(toDateStr(dd));
  }
  return dates;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function AdminReservationsPage() {
  const today = toDateStr(new Date());
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  // Création d'un nouveau RDV (staff)
  const [showNewRdv, setShowNewRdv] = useState(false);

  // Invitation à créer un compte (proposée après paiement à un passager)
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteDone,    setInviteDone]    = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState(today);
  const [rdvs,         setRdvs]         = useState<Rdv[]>([]);
  const [blocked,      setBlocked]      = useState<BlockedDay[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Staff list (admin only) + filtre employé sélectionné
  const [staff,           setStaff]           = useState<StaffMember[]>([]);
  const [filterEmployeId, setFilterEmployeId] = useState<string>(''); // '' = tous

  // Mode sélection pour blocage en masse
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()); // "date|heure"

  // Modal détails
  const [detailRdv,        setDetailRdv]        = useState<Rdv | null>(null);
  const [detailCommandes,  setDetailCommandes]  = useState<Commande[]>([]);
  const [loadingCommandes, setLoadingCommandes] = useState(false);

  // Édition des prestations depuis la modale
  const [allPrestations,     setAllPrestations]     = useState<PrestationItem[]>([]);
  const [editingPrestations, setEditingPrestations] = useState(false);
  const [draftPrestations,   setDraftPrestations]   = useState<string[]>([]);
  const [savingPrestations,  setSavingPrestations]  = useState(false);

  // Fidélité client affichée dans la modale
  const [detailFidelite, setDetailFidelite] = useState<Fidelite | null>(null);

  // Confirmation avant validation prestation
  const [showConfirmValid, setShowConfirmValid] = useState(false);

  // Modale annulation avec motif
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotif,     setCancelMotif]     = useState('');

  // Toast d'erreur global pour les actions admin (annulation, validation, blocage…)
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

  // ─── Chargement des prestations ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/prestations')
      .then(r => r.json())
      .then(d => setAllPrestations(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // Réinitialiser l'édition quand on change de RDV ouvert
  useEffect(() => {
    setEditingPrestations(false);
    setDraftPrestations([]);
    setInviteEmail('');
    setInviteDone(false);
  }, [detailRdv?._id]);

  // ─── Chargement des commandes du client à l'ouverture de la modale ─────────
  useEffect(() => {
    if (!detailRdv) {
      setDetailCommandes([]);
      setDetailFidelite(null);
      return;
    }
    setLoadingCommandes(true);
    fetch(`/api/commandes?clientEmail=${encodeURIComponent(detailRdv.clientEmail)}&statut=en-attente`)
      .then(r => r.json())
      .then(d => setDetailCommandes(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingCommandes(false));

    // Fidélité — lookup par email client, puis extraction de la personne concernée
    fetch(`/api/fidelite?clientEmail=${encodeURIComponent(detailRdv.clientEmail)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.personnes && Array.isArray(d.personnes) && d.personnes.length > 0) {
          setDetailFidelite(d.personnes[0]);
        } else {
          setDetailFidelite(null);
        }
      })
      .catch(console.error);
  }, [detailRdv?._id]);

  // ─── Chargement du staff (admin uniquement) ────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/employes')
      .then(r => r.json())
      .then(d => setStaff(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, [isAdmin]);

  // ─── Chargement des données ────────────────────────────────────────────────
  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const monthStr = toMonthStr(y, m);
    try {
      const params = new URLSearchParams({ month: monthStr });
      if (filterEmployeId) params.set('employeId', filterEmployeId);

      const [rdvRes, blockedRes] = await Promise.all([
        fetch(`/api/reservations?${params}`),
        fetch(`/api/blocked-slots?${params}`),
      ]);
      const rdvData     = await rdvRes.json();
      const blockedData = await blockedRes.json();
      setRdvs(Array.isArray(rdvData) ? rdvData : []);
      setBlocked(Array.isArray(blockedData) ? blockedData : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [filterEmployeId]);

  useEffect(() => {
    fetchMonth(calMonth.year, calMonth.month);
  }, [calMonth, fetchMonth]);

  // ─── Navigation mois ──────────────────────────────────────────────────────
  const prevMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setCalMonth(c => {
    const d = new Date(c.year, c.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Navigation semaine
  const prevWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setSelectedDate(toDateStr(d));
    // Changer de mois si nécessaire
    if (d.getMonth() !== calMonth.month || d.getFullYear() !== calMonth.year) {
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  };
  const nextWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setSelectedDate(toDateStr(d));
    if (d.getMonth() !== calMonth.month || d.getFullYear() !== calMonth.year) {
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  // ─── Helpers données par jour ─────────────────────────────────────────────
  const getRdvsForDay = (dateStr: string) =>
    rdvs.filter(r => toDateStr(new Date(r.date)) === dateStr && r.statut !== 'annule');

  const getBlockedForDay = (dateStr: string): Set<string> => {
    const day = blocked.find(b => toDateStr(new Date(b.date)) === dateStr);
    return new Set(day?.heures ?? []);
  };

  const getAdminBlockedForDay = (dateStr: string): Set<string> => {
    const day = blocked.find(b => toDateStr(new Date(b.date)) === dateStr);
    return new Set(day?.adminHeures ?? []);
  };

  // Slot map pour un jour donné
  const buildSlotMap = (dateStr: string) => {
    const dayRdvs = getRdvsForDay(dateStr);
    const slotMap = new Map<string, Rdv>();
    const continuationSlots = new Set<string>();
    const continuationMap = new Map<string, Rdv>();

    for (const rdv of dayRdvs) {
      const d = new Date(rdv.date);
      // UTC : la date du RDV est stockée comme heure murale du salon en UTC
      const startSlot = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      const idx = ALL_SLOTS.indexOf(startSlot);
      if (idx === -1) continue;

      slotMap.set(startSlot, rdv);
      const count = slotsNeeded(rdv.dureeMinutes ?? 30);
      for (let i = 1; i < count; i++) {
        if (idx + i < ALL_SLOTS.length) {
          continuationSlots.add(ALL_SLOTS[idx + i]);
          continuationMap.set(ALL_SLOTS[idx + i], rdv);
        }
      }
    }
    return { slotMap, continuationSlots, continuationMap };
  };

  // ─── Toggle blocage créneau unique ────────────────────────────────────────
  const toggleBlock = async (dateStr: string, heure: string) => {
    try {
      const res = await fetch('/api/blocked-slots', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          date: dateStr,
          heure,
          employeId: filterEmployeId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlocked(prev => {
          const others = prev.filter(b => toDateStr(new Date(b.date)) !== dateStr);
          if (data.heures.length > 0) {
            others.push({ date: `${dateStr}T00:00:00`, heures: data.heures, adminHeures: data.adminHeures || [] });
          }
          return others;
        });
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de modifier ce créneau.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Bloquer / débloquer une journée entière ──────────────────────────────
  // L'ouverture de la modale se fait via askToggleBlockDay (UI),
  // l'action serveur dans toggleBlockDay (callback de la modale).
  const [pendingDayToggle, setPendingDayToggle] = useState<{
    dateStr: string;
    action: 'block' | 'unblock';
  } | null>(null);
  const [dayToggleLoading, setDayToggleLoading] = useState(false);

  const askToggleBlockDay = (dateStr: string) => {
    const blockedSet   = getBlockedForDay(dateStr);
    const adminBlocked = getAdminBlockedForDay(dateStr);
    const allBlocked   = ALL_SLOTS.every(s => blockedSet.has(s));

    if (allBlocked && !isAdmin && ALL_SLOTS.some(s => adminBlocked.has(s))) {
      setActionError('Cette journée a été bloquée par le gérant. Vous ne pouvez pas la débloquer.');
      return;
    }

    setPendingDayToggle({ dateStr, action: allBlocked ? 'unblock' : 'block' });
  };

  const toggleBlockDay = async () => {
    if (!pendingDayToggle) return;
    const { dateStr, action } = pendingDayToggle;
    setDayToggleLoading(true);

    try {
      const res = await fetch('/api/blocked-slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: [{ date: dateStr, heures: ALL_SLOTS }],
          action,
          employeId: filterEmployeId || null,
        }),
      });
      if (res.ok) {
        fetchMonth(calMonth.year, calMonth.month);
        setPendingDayToggle(null);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible d\'appliquer le blocage. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setDayToggleLoading(false);
    }
  };

  // ─── Mode sélection ──────────────────────────────────────────────────────
  const toggleSelection = (dateStr: string, heure: string) => {
    const key = `${dateStr}|${heure}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSelected = (dateStr: string, heure: string) =>
    selectedSlots.has(`${dateStr}|${heure}`);

  const applyBulk = async (action: 'block' | 'unblock') => {
    // Grouper les heures sélectionnées PAR DATE (chaque date a ses propres heures).
    const byDate = new Map<string, string[]>();
    selectedSlots.forEach(key => {
      const [date, heure] = key.split('|');
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(heure);
    });

    const slots = Array.from(byDate.entries()).map(([date, heures]) => ({ date, heures }));

    try {
      const res = await fetch('/api/blocked-slots/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slots, action, employeId: filterEmployeId || null }),
      });
      if (res.ok) {
        setSelectionMode(false);
        setSelectedSlots(new Set());
        fetchMonth(calMonth.year, calMonth.month);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible d\'appliquer le blocage. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Annuler une réservation (avec motif + notifications) ─────────────────
  const annulerRdv = async (id: string, motif: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'annule', motifAnnulation: motif }),
      });
      if (res.ok) {
        setRdvs(prev => prev.map(r => r._id === id ? { ...r, statut: 'annule' } : r));
        if (detailRdv?._id === id) setDetailRdv(null);
        setShowCancelModal(false);
        setCancelMotif('');
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible d\'annuler ce rendez-vous. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Marquer un client comme absent ────────────────────────────────────────
  const marquerAbsent = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'absent' }),
      });
      if (res.ok) {
        setRdvs(prev => prev.map(r => r._id === id ? { ...r, statut: 'absent' } : r));
        if (detailRdv?._id === id) setDetailRdv(null);
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de marquer ce client absent. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Signaler un retard ───────────────────────────────────────────────────
  const signalerRetard = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ retardSignale: true }),
      });
      if (res.ok) {
        setRdvs(prev => prev.map(r => r._id === id ? { ...r, retardSignale: true } : r));
        if (detailRdv?._id === id) setDetailRdv({ ...detailRdv, retardSignale: true });
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de signaler le retard. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Valider la prestation (effectuée et payée) ──────────────────────────
  const validerPrestation = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prestationValidee: true }),
      });
      if (res.ok) {
        const fresh = await res.json();
        const patched = {
          prestationValidee:    true,
          statut:               'termine',
          fideliteReductionEur: fresh?.fideliteReductionEur ?? 0,
        };
        setRdvs(prev => prev.map(r => r._id === id ? { ...r, ...patched } : r));
        if (detailRdv?._id === id) setDetailRdv({ ...detailRdv, ...patched });

        // Rafraîchir la jauge de fidélité du client affichée dans la modale
        if (detailRdv?._id === id) {
          fetch(`/api/fidelite?clientEmail=${encodeURIComponent(detailRdv.clientEmail)}`)
            .then(r => r.json())
            .then(d => {
              if (d?.personnes && Array.isArray(d.personnes) && d.personnes.length > 0) {
                setDetailFidelite(d.personnes[0]);
              }
            })
            .catch(console.error);
        }
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || 'Impossible de valider la prestation. Réessayez.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  // ─── Proposer la création de compte à un passager (après paiement) ────────
  // Envoie un lien lié à CETTE réservation validée → 1er point fidélité à
  // l'inscription (la réservation sera rattachée au nouveau compte).
  const proposerCompte = async () => {
    if (!detailRdv) return;
    const email = (detailRdv.clientEmail || inviteEmail).trim();
    if (!email) {
      setActionError('Renseignez un email pour envoyer le lien de création de compte.');
      return;
    }
    setInviteSending(true);
    try {
      const res = await fetch('/api/account-invites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          prenom:        detailRdv.clientNom,
          telephone:     detailRdv.clientTel,
          reservationId: detailRdv._id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setInviteDone(true);
      } else {
        setActionError(data?.error || 'Impossible d\'envoyer l\'invitation.');
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setInviteSending(false);
    }
  };

  // ─── Modifier les prestations d'un RDV (admin) ───────────────────────────
  const savePrestations = async () => {
    if (!detailRdv) return;
    if (draftPrestations.length < 1 || draftPrestations.length > MAX_PRESTATIONS_PAR_RDV) {
      alert(`Il faut entre 1 et ${MAX_PRESTATIONS_PAR_RDV} prestations.`);
      return;
    }
    setSavingPrestations(true);
    try {
      const res = await fetch(`/api/reservations/${detailRdv._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prestations: draftPrestations }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur : ${err?.error ?? 'impossible de modifier les prestations.'}`);
        return;
      }
      const updated = await res.json();
      // Mise à jour locale
      setRdvs(prev => prev.map(r => r._id === detailRdv._id
        ? { ...r, prestations: updated.prestations, dureeMinutes: updated.dureeMinutes }
        : r));
      setDetailRdv(prev => prev ? { ...prev, prestations: updated.prestations, dureeMinutes: updated.dureeMinutes } : prev);
      setEditingPrestations(false);
    } catch (err) {
      console.error('[savePrestations] network error', err);
      alert('Erreur réseau lors de la modification des prestations.');
    } finally {
      setSavingPrestations(false);
    }
  };

  // ─── Marquer un article de commande comme livré ──────────────────────────
  // Optimistic update : on marque immédiatement côté UI, puis on confirme via l'API.
  // Si l'API échoue on restaure l'état précédent et on affiche l'erreur.
  const livrerArticle = async (commandeId: string, index: number) => {
    // Snapshot pour rollback
    const snapshot = detailCommandes;

    // Optimistic update local
    setDetailCommandes(prev =>
      prev.map(c =>
        c._id === commandeId
          ? { ...c, articles: c.articles.map((a, i) => i === index ? { ...a, livre: true } : a) }
          : c
      )
    );

    try {
      const res = await fetch(`/api/commandes/${commandeId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ livrerArticleIndex: index, livre: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[livrerArticle] API error', res.status, err);
        alert(`Erreur : impossible de marquer l'article comme livré.${err?.error ? '\n' + err.error : ''}`);
        setDetailCommandes(snapshot); // rollback
        return;
      }

      // Confirmation : on remplace par la version serveur
      const updated = await res.json();
      console.log('[livrerArticle] server response', {
        commandeId,
        index,
        articleLivre: updated?.articles?.[index]?.livre,
        full: updated,
      });
      setDetailCommandes(prev => prev.map(c => c._id === commandeId ? updated : c));
    } catch (err) {
      console.error('[livrerArticle] network error', err);
      alert('Erreur réseau : impossible de marquer l\'article comme livré.');
      setDetailCommandes(snapshot); // rollback
    }
  };

  // ─── Indicateurs par jour ─────────────────────────────────────────────────
  const rdvCountByDay = new Map<string, number>();
  for (const r of rdvs) {
    if (r.statut === 'annule' || r.statut === 'absent') continue;
    const ds = toDateStr(new Date(r.date));
    rdvCountByDay.set(ds, (rdvCountByDay.get(ds) ?? 0) + 1);
  }

  // ─── Mini calendrier ─────────────────────────────────────────────────────
  const renderCalendar = () => {
    const { year, month } = calMonth;
    const firstDay  = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const weekDates = viewMode === 'week' ? new Set(getWeekDates(selectedDate)) : null;

    const cells: React.ReactNode[] = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`e${i}`} />);
    }

    for (let d = 1; d <= daysCount; d++) {
      const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday    = dateStr === today;
      const hasRdv     = rdvCountByDay.has(dateStr);
      const inWeek     = weekDates?.has(dateStr);

      cells.push(
        <button
          key={d}
          onClick={() => setSelectedDate(dateStr)}
          className={`relative w-9 h-9 rounded-full text-sm font-body transition-colors
            ${isSelected
              ? 'bg-yellow-400 text-gray-900 font-bold'
              : inWeek
                ? 'bg-yellow-100 text-gray-900 font-semibold'
                : isToday
                  ? 'ring-1 ring-yellow-400 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          {d}
          {hasRdv && !isSelected && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-400" />
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-body text-sm font-semibold text-gray-900">
            {MOIS[month]} {year}
          </span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
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

  // ─── Planning du jour ─────────────────────────────────────────────────────
  const renderDaySchedule = () => {
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const jourSemaine = JOURS_LONG[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    const jourNum = dateObj.getDate();
    const moisNom = MOIS[dateObj.getMonth()];

    const dayRdvs        = getRdvsForDay(selectedDate);
    const blockedSet     = getBlockedForDay(selectedDate);
    const adminBlocked   = getAdminBlockedForDay(selectedDate);
    const { slotMap, continuationSlots, continuationMap } = buildSlotMap(selectedDate);

    const allDayBlocked = ALL_SLOTS.every(s => blockedSet.has(s));
    const dayLockedByAdmin = !isAdmin && allDayBlocked && ALL_SLOTS.some(s => adminBlocked.has(s));

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-body text-base font-semibold text-gray-900">
              {jourSemaine} {jourNum} {moisNom} {dateObj.getFullYear()}
            </h2>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              {dayRdvs.length} réservation{dayRdvs.length !== 1 ? 's' : ''} · {blockedSet.size} créneau{blockedSet.size !== 1 ? 'x' : ''} bloqué{blockedSet.size !== 1 ? 's' : ''}
            </p>
          </div>
          {!selectionMode && (
            dayLockedByAdmin ? (
              <span className="flex items-center gap-1.5 font-body text-xs text-gray-400 cursor-not-allowed"
                title="Bloqué par le gérant">
                <Lock size={12} /> Journée bloquée (gérant)
              </span>
            ) : (
              <button
                onClick={() => askToggleBlockDay(selectedDate)}
                className={`flex items-center gap-1.5 font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  allDayBlocked
                    ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                    : 'text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {allDayBlocked ? <><Unlock size={12} /> Débloquer la journée</> : <><Lock size={12} /> Bloquer la journée</>}
              </button>
            )
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {ALL_SLOTS.map(slot => {
            const rdv            = slotMap.get(slot);
            const isContinuation = continuationSlots.has(slot);
            const isBlocked      = blockedSet.has(slot);
            const isOccupied     = rdv || isContinuation;
            const selected       = selectionMode && isSelected(selectedDate, slot);

            const contRdv    = continuationMap.get(slot);
            const isValidated = (rdv?.prestationValidee ?? contRdv?.prestationValidee) === true || (rdv?.statut ?? contRdv?.statut) === 'absent';

            return (
              <div
                key={slot}
                onClick={() => {
                  if (selectionMode && !isOccupied) toggleSelection(selectedDate, slot);
                  else if (rdv) setDetailRdv(rdv);
                }}
                className={`flex items-center gap-4 px-6 py-3 transition-colors
                  ${selected       ? 'bg-blue-100 ring-1 ring-inset ring-blue-300'
                  : rdv            ? (isValidated ? 'bg-gray-100 cursor-pointer hover:bg-gray-200/80' : 'bg-yellow-50 cursor-pointer hover:bg-yellow-100/80')
                  : isContinuation ? (isValidated ? 'bg-gray-100/60' : 'bg-yellow-50/50')
                  : isBlocked      ? 'bg-gray-100'
                  : selectionMode  ? 'hover:bg-blue-50 cursor-pointer'
                  : 'hover:bg-gray-50'
                  }`}
              >
                {/* Checkbox en mode sélection */}
                {selectionMode && !isOccupied && (
                  <span className="flex-shrink-0 text-blue-400">
                    {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </span>
                )}

                {/* Heure */}
                <span className={`font-body text-sm w-14 flex-shrink-0 tabular-nums
                  ${isOccupied
                    ? (isValidated ? 'text-gray-500 font-semibold' : 'text-yellow-700 font-semibold')
                    : isBlocked ? 'text-gray-400' : 'text-gray-500'}`}>
                  {slot}
                </span>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  {rdv && (
                    <div className="flex items-center gap-3">
                      <span className={`font-body text-sm font-semibold truncate ${isValidated ? 'text-gray-500' : 'text-gray-900'}`}>
                        {rdv.clientNom}
                      </span>
                      <span className={`font-body text-xs px-2 py-0.5 rounded-full truncate
                        ${isValidated ? 'text-gray-500 bg-gray-200' : 'text-yellow-700 bg-yellow-100'}`}>
                        {rdv.prestations.join(', ')}
                      </span>
                      <span className="font-body text-[10px] text-gray-400">
                        #{rdv.numero}
                      </span>
                      {rdv.retardSignale && !isValidated && (
                        <span className="text-orange-500" title="Retard signalé">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                      {isValidated && rdv.statut !== 'absent' && (
                        <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold uppercase tracking-wider
                          text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <Check size={10} /> Terminée
                        </span>
                      )}
                      {rdv.statut === 'absent' && (
                        <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold uppercase tracking-wider
                          text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          <UserX size={10} /> Absent
                        </span>
                      )}
                    </div>
                  )}
                  {isContinuation && !rdv && (
                    <span className={`font-body text-xs italic ${isValidated ? 'text-gray-400/70' : 'text-yellow-600/60'}`}>suite</span>
                  )}
                  {isBlocked && !isOccupied && (
                    <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                      <Lock size={10} /> Indisponible
                      {!isAdmin && adminBlocked.has(slot) && (
                        <span className="text-[10px] text-gray-300 ml-1">(gérant)</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Actions (hors mode sélection) */}
                {!selectionMode && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rdv && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailRdv(rdv); }}
                          className="text-gray-300 hover:text-blue-400 transition-colors"
                          title="Détails"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailRdv(rdv); setShowCancelModal(true); setCancelMotif(''); }}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Annuler le RDV"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {!isOccupied && (() => {
                      const lockedByAdmin = !isAdmin && isBlocked && adminBlocked.has(slot);
                      return lockedByAdmin ? (
                        <span className="text-gray-300 cursor-not-allowed" title="Bloqué par le gérant">
                          <Lock size={14} />
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleBlock(selectedDate, slot)}
                          className={`transition-colors ${isBlocked
                            ? 'text-gray-400 hover:text-green-500'
                            : 'text-gray-200 hover:text-gray-500'
                          }`}
                          title={isBlocked ? 'Débloquer' : 'Bloquer'}
                        >
                          {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Planning semaine ─────────────────────────────────────────────────────
  const renderWeekSchedule = () => {
    const weekDates = getWeekDates(selectedDate);
    // Garde : getWeekDates est censé retourner 6 entrées (Lun-Sam). Si pour une
    // raison ou une autre il renvoie moins, on retombe sur la dernière entrée
    // disponible pour éviter un `Invalid Date` au render.
    const firstDate = weekDates[0] ?? selectedDate;
    const lastDate  = weekDates[weekDates.length - 1] ?? firstDate;
    const weekStart = new Date(firstDate + 'T12:00:00');
    const weekEnd   = new Date(lastDate + 'T12:00:00');

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* En-tête semaine */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={prevWeek} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-body text-sm font-semibold text-gray-900">
            Semaine du {weekStart.getDate()} au {weekEnd.getDate()} {MOIS[weekEnd.getMonth()]} {weekEnd.getFullYear()}
          </h2>
          <button onClick={nextWeek} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-16 py-3 px-3 text-left font-body text-[10px] text-gray-400 font-semibold">
                  Heure
                </th>
                {weekDates.map((dateStr, i) => {
                  const d = new Date(dateStr + 'T12:00:00');
                  const isToday = dateStr === today;
                  return (
                    <th
                      key={dateStr}
                      className={`py-3 px-2 text-center font-body text-xs font-semibold cursor-pointer hover:bg-gray-50 transition-colors
                        ${isToday ? 'text-yellow-600 bg-yellow-50/50' : 'text-gray-600'}`}
                      onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                    >
                      <div>{JOURS_COURT[i]}</div>
                      <div className={`text-lg ${isToday ? 'text-yellow-600' : 'text-gray-900'}`}>{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ALL_SLOTS.map(slot => (
                <tr key={slot} className="border-b border-gray-50">
                  <td className="py-1.5 px-3 font-body text-xs text-gray-400 tabular-nums align-top">
                    {slot}
                  </td>
                  {weekDates.map(dateStr => {
                    const { slotMap, continuationSlots, continuationMap } = buildSlotMap(dateStr);
                    const blockedSet    = getBlockedForDay(dateStr);
                    const adminBlkWeek  = getAdminBlockedForDay(dateStr);
                    const rdv            = slotMap.get(slot);
                    const isContinuation = continuationSlots.has(slot);
                    const isBlocked      = blockedSet.has(slot);
                    const isOccupied     = rdv || isContinuation;
                    const selected       = selectionMode && isSelected(dateStr, slot);
                    const contRdv        = continuationMap.get(slot);
                    const isValidated    = (rdv?.prestationValidee ?? contRdv?.prestationValidee) === true;

                    return (
                      <td
                        key={dateStr}
                        onClick={() => {
                          if (selectionMode && !isOccupied) toggleSelection(dateStr, slot);
                          else if (rdv) setDetailRdv(rdv);
                        }}
                        className={`py-1.5 px-2 text-center align-top transition-colors
                          ${selected       ? 'bg-blue-100 ring-1 ring-inset ring-blue-200'
                          : rdv            ? (isValidated ? 'bg-gray-100 cursor-pointer hover:bg-gray-200' : 'bg-yellow-50 cursor-pointer hover:bg-yellow-100')
                          : isContinuation ? (isValidated ? 'bg-gray-100/60' : 'bg-yellow-50/40')
                          : isBlocked      ? 'bg-gray-100'
                          : selectionMode  ? 'hover:bg-blue-50 cursor-pointer'
                          : 'hover:bg-gray-50'
                          }`}
                      >
                        {rdv && (
                          <div className="text-left">
                            <div className={`font-body text-[11px] font-semibold truncate leading-tight ${isValidated ? 'text-gray-500' : 'text-gray-900'}`}>
                              {rdv.clientNom}
                            </div>
                            <div className="font-body text-[8px] text-gray-400 tabular-nums truncate leading-tight">
                              #{rdv.numero}
                            </div>
                            {rdv.statut === 'absent' ? (
                              <div className="inline-flex items-center gap-0.5 font-body text-[8px] font-semibold uppercase tracking-wider
                                text-gray-500 bg-gray-100 border border-gray-200 px-1 py-0 rounded-full leading-tight">
                                <UserX size={7} /> Absent
                              </div>
                            ) : isValidated ? (
                              <div className="inline-flex items-center gap-0.5 font-body text-[8px] font-semibold uppercase tracking-wider
                                text-green-700 bg-green-50 border border-green-200 px-1 py-0 rounded-full leading-tight">
                                <Check size={7} /> Terminée
                              </div>
                            ) : (
                              <div className="font-body text-[9px] text-yellow-700 truncate leading-tight">
                                {rdv.prestations[0]}
                              </div>
                            )}
                          </div>
                        )}
                        {isContinuation && !rdv && (
                          <span className={`font-body text-[9px] ${isValidated ? 'text-gray-400/60' : 'text-yellow-500/50'}`}>·</span>
                        )}
                        {isBlocked && !isOccupied && (
                          <Lock size={10} className={`mx-auto ${!isAdmin && adminBlkWeek.has(slot) ? 'text-red-300' : 'text-gray-300'}`} />
                        )}
                        {selectionMode && !isOccupied && selected && (
                          <CheckSquare size={12} className="mx-auto text-blue-400" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Modal détails réservation ────────────────────────────────────────────
  const renderDetailModal = () => {
    if (!detailRdv) return null;
    const rdv = detailRdv;
    const dateObj = new Date(rdv.date);
    // Lecture en UTC : la date est stockée comme heure murale du salon en UTC
    const jourSemaine = JOURS_LONG[dateObj.getUTCDay() === 0 ? 6 : dateObj.getUTCDay() - 1];
    const heure = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;

    return (
      <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setDetailRdv(null); setShowConfirmValid(false); }}>
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-body text-base font-semibold text-gray-900">
                Réservation #{rdv.numero}
              </h3>
              <p className="font-body text-xs text-gray-400 mt-0.5">
                Créée le {new Date(rdv.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <button onClick={() => setDetailRdv(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Infos */}
          <div className="px-6 py-5 space-y-4">
            {/* Retard badge */}
            {rdv.retardSignale && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-orange-500" />
                <span className="font-body text-xs text-orange-700 font-medium">Retard signalé au client</span>
              </div>
            )}

            {/* Date & heure */}
            <div className="flex items-start gap-3">
              <CalendarDays size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-body text-sm font-medium text-gray-900">
                  {jourSemaine} {dateObj.getDate()} {MOIS[dateObj.getMonth()]} {dateObj.getFullYear()}
                </p>
                <p className="font-body text-sm text-gray-500">{heure} · {rdv.dureeMinutes} min</p>
              </div>
            </div>

            {/* Client */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-body text-xs text-gray-400 uppercase tracking-wider font-semibold">Client</p>
              <p className="font-body text-sm font-medium text-gray-900">{rdv.clientNom}</p>
              <p className="font-body text-sm text-gray-600">{rdv.clientEmail}</p>
              {rdv.clientTel && <p className="font-body text-sm text-gray-600">{rdv.clientTel}</p>}
            </div>

            {/* Fidélité client */}
            {detailFidelite && (() => {
              const { cycleCount, reservationsUntilReward, palier, rewardPercent, totalValidees } = detailFidelite;
              const rewardReady = cycleCount === 0 && totalValidees > 0;
              const hasPrimeOnThisRdv = (rdv.fideliteReductionEur ?? 0) > 0;
              return (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Gift size={13} className="text-yellow-600" />
                      <span className="font-body text-[10px] font-bold uppercase tracking-wider text-yellow-800">
                        Fidélité
                      </span>
                    </div>
                    <span className="font-body text-[10px] text-yellow-700">
                      {totalValidees} validée{totalValidees > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Jauge */}
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: palier }).map((_, i) => {
                      const filled = i < cycleCount;
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full ${filled ? 'bg-yellow-500' : 'bg-yellow-200'}`}
                        />
                      );
                    })}
                  </div>

                  <p className="font-body text-[11px] text-yellow-800">
                    {hasPrimeOnThisRdv ? (
                      <>Remise fidélité <strong>−{rdv.fideliteReductionEur} €</strong> appliquée sur ce RDV</>
                    ) : rewardReady ? (
                      <>Remise de <strong>{rewardPercent} %</strong> disponible sur le prochain RDV validé</>
                    ) : (
                      <>Encore {reservationsUntilReward} RDV avant {rewardPercent} % de remise</>
                    )}
                  </p>
                </div>
              );
            })()}

            {/* Coiffeur */}
            {rdv.employeId && staff.length > 0 && (
              <div>
                <p className="font-body text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Coiffeur</p>
                <p className="font-body text-sm text-gray-900">
                  {staff.find(s => s._id === rdv.employeId)?.prenom ?? 'Non assigné'}{' '}
                  {staff.find(s => s._id === rdv.employeId)?.nom ?? ''}
                </p>
              </div>
            )}

            {/* Prestations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Prestation{(editingPrestations ? draftPrestations.length : rdv.prestations.length) > 1 ? 's' : ''}
                </p>
                {isAdmin && !editingPrestations && !rdv.prestationValidee && rdv.statut !== 'annule' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPrestations([...rdv.prestations]);
                      setEditingPrestations(true);
                    }}
                    className="flex items-center gap-1 font-body text-[10px] font-semibold uppercase tracking-wider
                      text-gray-500 hover:text-yellow-600 transition-colors"
                    title="Modifier les prestations"
                  >
                    <Edit3 size={11} /> Modifier
                  </button>
                )}
              </div>

              {!editingPrestations ? (
                <div className="flex flex-wrap gap-2">
                  {rdv.prestations.map((p, i) => (
                    <span key={i} className="font-body text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 bg-yellow-50/40 border border-yellow-200 rounded-lg p-3">
                  {/* Chips des prestations sélectionnées */}
                  <div className="flex flex-wrap gap-2">
                    {draftPrestations.length === 0 && (
                      <span className="font-body text-xs text-gray-400 italic">
                        Sélectionnez au moins une prestation.
                      </span>
                    )}
                    {draftPrestations.map((nom, i) => (
                      <span
                        key={`${nom}-${i}`}
                        className="inline-flex items-center gap-1.5 font-body text-sm bg-white text-yellow-800 border border-yellow-300 pl-3 pr-1.5 py-1 rounded-full"
                      >
                        {nom}
                        <button
                          type="button"
                          onClick={() => setDraftPrestations(prev => prev.filter((_, idx) => idx !== i))}
                          className="flex items-center justify-center w-4 h-4 rounded-full text-yellow-700 hover:bg-yellow-200 transition-colors"
                          title="Retirer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Ajouter une prestation */}
                  {draftPrestations.length < MAX_PRESTATIONS_PAR_RDV && (
                    <div className="flex items-center gap-2">
                      <Plus size={12} className="text-gray-400 flex-shrink-0" />
                      <select
                        value=""
                        onChange={e => {
                          const val = e.target.value;
                          if (val) setDraftPrestations(prev => [...prev, val]);
                        }}
                        className="flex-1 font-body text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-yellow-400"
                      >
                        <option value="">Ajouter une prestation...</option>
                        {Array.from(new Set(allPrestations.map(p => p.categorie).filter(Boolean))).map(cat => {
                          const items = allPrestations.filter(
                            p => p.categorie === cat && !draftPrestations.includes(p.nom)
                          );
                          if (items.length === 0) return null;
                          return (
                            <optgroup key={cat} label={cat}>
                              {items.map(p => (
                                <option key={p._id} value={p.nom}>
                                  {p.nom} — {p.duree} · {p.prix}€
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={savePrestations}
                      disabled={savingPrestations || draftPrestations.length < 1}
                      className="flex-1 flex items-center justify-center gap-1.5 font-body text-xs font-semibold
                        bg-yellow-400 text-gray-900 rounded px-3 py-2
                        hover:bg-yellow-500 transition-colors disabled:opacity-40"
                    >
                      {savingPrestations
                        ? <><Loader2 size={12} className="animate-spin" /> Enregistrement...</>
                        : <><Check size={12} /> Enregistrer</>
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrestations(false);
                        setDraftPrestations([]);
                      }}
                      disabled={savingPrestations}
                      className="font-body text-xs text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 disabled:opacity-40"
                    >
                      Annuler
                    </button>
                  </div>
                  <p className="font-body text-[10px] text-gray-400 italic">
                    Entre 1 et {MAX_PRESTATIONS_PAR_RDV} prestations. La durée sera recalculée automatiquement.
                  </p>
                </div>
              )}
            </div>

            {/* Produits réservés (commandes boutique) */}
            <div>
              <p className="font-body text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <Package size={12} /> Produits boutique réservés
              </p>
              {(() => {
                // On masque les articles déjà livrés, et on retire les commandes
                // dont tous les articles sont livrés.
                const commandesAffichables = detailCommandes
                  .map(cmd => ({
                    ...cmd,
                    articlesRestants: cmd.articles
                      .map((a, i) => ({ article: a, originalIndex: i }))
                      .filter(({ article }) => !article.livre),
                  }))
                  .filter(cmd => cmd.articlesRestants.length > 0);

                if (loadingCommandes) {
                  return (
                    <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                      <Loader2 size={12} className="animate-spin" /> Chargement...
                    </div>
                  );
                }
                if (commandesAffichables.length === 0) {
                  return <p className="font-body text-xs text-gray-400 italic">Aucun produit réservé.</p>;
                }
                return (
                <div className="space-y-3">
                  {commandesAffichables.map(cmd => {
                    return (
                      <div key={cmd._id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-body text-[11px] font-semibold text-gray-500">
                            {cmd.numero}
                          </span>
                          <span className="font-body text-[11px] text-gray-400">
                            {cmd.total.toFixed(2)} €
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {cmd.articlesRestants.map(({ article: a, originalIndex }) => (
                            <div key={originalIndex} className="flex items-center justify-between gap-2 font-body text-sm rounded px-2 py-1.5 bg-gray-50">
                              <span className="flex-1 truncate">{a.nom} × {a.quantite}</span>
                              <span className="font-medium whitespace-nowrap">{(a.prix * a.quantite).toFixed(2)} €</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  livrerArticle(cmd._id, originalIndex);
                                }}
                                className="font-body text-[10px] font-semibold uppercase tracking-wider
                                  bg-yellow-400 text-gray-900 hover:bg-yellow-500 active:bg-yellow-600
                                  transition-colors px-2.5 py-1 rounded shadow-sm
                                  flex items-center gap-1 cursor-pointer"
                                title="Marquer comme livré"
                              >
                                <Package size={10} /> Livrer
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>

            {/* Statut prestation */}
            {rdv.prestationValidee && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <Check size={14} className="text-green-600" />
                <span className="font-body text-xs text-green-700 font-medium">Prestation effectuée et payée</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {/* Proposer la création de compte (passager sans compte, après paiement) */}
            {rdv.prestationValidee && !(rdv as any).userId && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 p-3 space-y-2">
                {inviteDone ? (
                  <p className="font-body text-xs text-green-700 flex items-center gap-1.5">
                    <Check size={13} /> Lien de création de compte envoyé.
                  </p>
                ) : (
                  <>
                    <p className="font-body text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
                      <Gift size={13} /> Proposer la création de compte
                    </p>
                    <p className="font-body text-[11px] text-yellow-700 leading-snug">
                      Le client recevra un lien par email. En créant son compte, il démarre avec
                      son <strong>premier point de fidélité</strong> (cette prestation lui sera rattachée).
                    </p>
                    {!rdv.clientEmail && (
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="Email du client"
                        className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm font-body outline-none focus:border-yellow-500"
                      />
                    )}
                    <button
                      onClick={proposerCompte}
                      disabled={inviteSending}
                      className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold
                        bg-yellow-400 text-gray-900 rounded px-3 py-2 hover:bg-yellow-500 transition-colors disabled:opacity-50"
                    >
                      {inviteSending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                      Envoyer le lien
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Valider la prestation : action principale */}
            {/* Statut absent */}
            {rdv.statut === 'absent' && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <UserX size={14} className="text-gray-500" />
                <span className="font-body text-xs text-gray-500 font-medium">Client absent</span>
              </div>
            )}

            {!rdv.prestationValidee && rdv.statut !== 'annule' && rdv.statut !== 'absent' && (
              <button
                onClick={() => setShowConfirmValid(true)}
                className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold
                  bg-green-500 text-white rounded-lg px-4 py-2.5
                  hover:bg-green-600 transition-colors"
              >
                <Check size={14} /> Procéder au paiement
              </button>
            )}

            {!rdv.prestationValidee && rdv.statut !== 'annule' && rdv.statut !== 'absent' && (
              <div className="flex gap-3">
                {rdv.statut === 'a-venir' && !rdv.retardSignale && (
                  <button
                    onClick={() => signalerRetard(rdv._id)}
                    className="flex-1 flex items-center justify-center gap-2 font-body text-sm font-medium
                      bg-orange-50 text-orange-700 border border-orange-200 rounded-lg px-4 py-2.5
                      hover:bg-orange-100 transition-colors"
                  >
                    <Clock size={14} /> Signaler retard
                  </button>
                )}
                <button
                  onClick={() => marquerAbsent(rdv._id)}
                  className="flex-1 flex items-center justify-center gap-2 font-body text-sm font-medium
                    bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-4 py-2.5
                    hover:bg-gray-100 transition-colors"
                >
                  <UserX size={14} /> Absent
                </button>
                <button
                  onClick={() => { setShowCancelModal(true); setCancelMotif(''); }}
                  className="flex-1 flex items-center justify-center gap-2 font-body text-sm font-medium
                    bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2.5
                    hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} /> Annuler le RDV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation de validation/paiement ── */}
      {showConfirmValid && (() => {
        const priceMap = new Map(allPrestations.map(p => [p.nom, p.prix]));
        const lignes = (rdv.prestations ?? []).map(nom => ({
          nom,
          prix: priceMap.get(nom) ?? 0,
        }));
        const brut = lignes.reduce((s, l) => s + l.prix, 0);
        const fidelite = rdv.fideliteReductionEur ?? 0;
        // Vérifier si la remise fidélité sera appliquée au moment de la validation
        // (cette validation correspond au palier → remise de rewardPercent %).
        const willGetPrime = detailFidelite
          ? detailFidelite.reservationsUntilReward === 1
          : false;
        const rewardPct = detailFidelite?.rewardPercent ?? 5;
        const primeAmount = willGetPrime ? Math.round(brut * rewardPct) / 100 : fidelite;
        const total = Math.max(0, brut - primeAmount);

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
            onClick={() => setShowConfirmValid(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4"
              onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-body text-base font-bold text-gray-900">Confirmer le paiement</h3>
                <p className="font-body text-xs text-gray-500 mt-0.5">RDV {rdv.numero} — {rdv.clientNom}</p>
              </div>

              <div className="px-6 py-4 space-y-2">
                {lignes.map((l, i) => (
                  <div key={i} className="flex justify-between font-body text-sm">
                    <span className="text-gray-700">{l.nom}</span>
                    <span className="text-gray-900 font-medium">{l.prix.toFixed(2)} €</span>
                  </div>
                ))}

                {primeAmount > 0 && (
                  <>
                    <div className="border-t border-gray-100 pt-2 flex justify-between font-body text-sm">
                      <span className="text-gray-500">Sous-total</span>
                      <span className="text-gray-600">{brut.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-body text-sm text-green-600">
                      <span>Remise fidélité</span>
                      <span>−{primeAmount.toFixed(2)} €</span>
                    </div>
                  </>
                )}

                <div className="border-t border-gray-200 pt-3 flex justify-between font-body text-lg font-bold">
                  <span className="text-gray-900">Total à encaisser</span>
                  <span className="text-gray-900">{total.toFixed(2)} €</span>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowConfirmValid(false)}
                  className="flex-1 font-body text-sm font-medium text-gray-600 bg-gray-100
                    rounded-lg px-4 py-2.5 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowConfirmValid(false);
                    validerPrestation(rdv._id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 font-body text-sm font-semibold
                    bg-green-500 text-white rounded-lg px-4 py-2.5
                    hover:bg-green-600 transition-colors"
                >
                  <Check size={14} /> Confirmer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modale annulation avec motif ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-body text-base font-bold text-red-600">Annuler le rendez-vous</h3>
              <p className="font-body text-xs text-gray-500 mt-0.5">RDV {rdv.numero} — {rdv.clientNom}</p>
            </div>

            <div className="px-6 py-4">
              <label className="font-body text-sm font-medium text-gray-700 block mb-2">
                Motif d'annulation <span className="text-red-400">*</span>
              </label>
              <textarea
                value={cancelMotif}
                onChange={e => setCancelMotif(e.target.value)}
                placeholder="Ex : Indisponibilité du coiffeur, fermeture exceptionnelle..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 font-body text-sm
                  text-gray-900 outline-none focus:border-yellow-500 resize-none"
              />
              <p className="font-body text-[11px] text-gray-400 mt-1">
                Un email et un SMS seront envoyés au client avec ce motif.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 font-body text-sm font-medium text-gray-600 bg-gray-100
                  rounded-lg px-4 py-2.5 hover:bg-gray-200 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={() => {
                  if (!cancelMotif.trim()) { alert('Le motif est obligatoire.'); return; }
                  annulerRdv(rdv._id, cancelMotif.trim());
                }}
                className="flex-1 flex items-center justify-center gap-2 font-body text-sm font-semibold
                  bg-red-500 text-white rounded-lg px-4 py-2.5
                  hover:bg-red-600 transition-colors"
              >
                <Trash2 size={14} /> Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

  // ─── Barre d'outils sélection ─────────────────────────────────────────────
  const renderSelectionBar = () => {
    if (!selectionMode) return null;
    const count = selectedSlots.size;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 flex items-center justify-between gap-4">
        <span className="font-body text-sm text-blue-800">
          {count} créneau{count !== 1 ? 'x' : ''} sélectionné{count !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyBulk('block')}
            disabled={count === 0}
            className="font-body text-xs font-medium bg-gray-800 text-white px-4 py-2 rounded-lg
              hover:bg-gray-900 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <Lock size={12} /> Bloquer
          </button>
          <button
            onClick={() => applyBulk('unblock')}
            disabled={count === 0}
            className="font-body text-xs font-medium bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg
              hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <Unlock size={12} /> Débloquer
          </button>
          <button
            onClick={() => { setSelectionMode(false); setSelectedSlots(new Set()); }}
            className="font-body text-xs text-gray-400 hover:text-gray-600 transition-colors px-2"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Modale de confirmation blocage/déblocage journée */}
      <ConfirmModal
        open={!!pendingDayToggle}
        title={pendingDayToggle?.action === 'block'
          ? 'Bloquer toute la journée ?'
          : 'Débloquer toute la journée ?'}
        message={pendingDayToggle?.action === 'block'
          ? 'Tous les créneaux de cette journée seront marqués bloqués et indisponibles à la réservation.'
          : 'Tous les créneaux de cette journée redeviendront disponibles à la réservation.'}
        confirmLabel={pendingDayToggle?.action === 'block' ? 'Bloquer la journée' : 'Débloquer la journée'}
        variant={pendingDayToggle?.action === 'block' ? 'danger' : 'default'}
        loading={dayToggleLoading}
        onConfirm={toggleBlockDay}
        onCancel={() => setPendingDayToggle(null)}
      />

      {/* Toast d'erreur global (auto-disparait après 5 s) */}
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-body text-2xl font-bold text-gray-900">Réservations</h1>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Nouveau RDV (staff) */}
          <button
            onClick={() => setShowNewRdv(true)}
            className="font-body text-xs font-semibold bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg
              hover:bg-yellow-500 transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> Nouveau RDV
          </button>

          {/* Filtre par employé (admin uniquement) */}
          {isAdmin && staff.length > 0 && (
            <div className="relative">
              <select
                value={filterEmployeId}
                onChange={e => setFilterEmployeId(e.target.value)}
                className="font-body text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white text-gray-700"
              >
                <option value="">Tous les coiffeurs</option>
                {staff.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.prenom} {s.nom}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Toggle mode sélection */}
          {!selectionMode && (
            <button
              onClick={() => setSelectionMode(true)}
              className="font-body text-xs font-medium text-gray-500 border border-gray-200 px-3 py-2 rounded-lg
                hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <CheckSquare size={13} /> Sélection
            </button>
          )}

          {/* Toggle vue */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`font-body text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5
                ${viewMode === 'day' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarDays size={13} /> Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`font-body text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5
                ${viewMode === 'week' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarRange size={13} /> Semaine
            </button>
          </div>
        </div>
      </div>

      {/* Barre sélection */}
      {renderSelectionBar()}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      ) : (
        <div className={`grid gap-6 mt-4
          ${viewMode === 'day' ? 'grid-cols-1 lg:grid-cols-[280px_1fr]' : 'grid-cols-1 lg:grid-cols-[280px_1fr]'}`}>
          {/* Calendrier */}
          <div>{renderCalendar()}</div>

          {/* Planning */}
          <div>
            {viewMode === 'day' ? renderDaySchedule() : renderWeekSchedule()}
          </div>
        </div>
      )}

      {/* Modal détails */}
      {renderDetailModal()}

      {/* Modal création de RDV (staff) */}
      <NewReservationModal
        open={showNewRdv}
        onClose={() => setShowNewRdv(false)}
        onCreated={() => fetchMonth(calMonth.year, calMonth.month)}
        isAdmin={isAdmin}
        currentUserId={user?.id ?? ''}
        staff={staff}
        prestations={allPrestations}
        defaultDate={selectedDate}
      />
    </div>
  );
}
