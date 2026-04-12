'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SectionTitle from '../ui/SectionTitle';
import { Loader2, Calendar, User, Users, UserPlus, Scissors, ChevronDown, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Prestation = {
  _id:       string;
  categorie: string;
  nom:       string;
  duree:     string;
  prix:      number;
};

type UserProfile = {
  prenom:          string;
  nom:             string;
  email:           string;
  telephone:       string;
  blackliste?:     boolean;
  autresPersonnes: { prenom: string; nom: string }[];
};

type Slot = { heure: string; disponible: boolean };

type StaffMember = { _id: string; prenom: string; nom: string };

type FormState = {
  prenom:        string;
  email:         string;
  telephone:     string;
  date:          string; // YYYY-MM-DD
  heure:         string; // HH:MM
  prestationIds: string[]; // 1 à 3 prestations
  employeId:     string; // '' = pas de préférence
  pourQui:       string;
  autrePrenom:   string;
  autreNom:      string;
};

const MAX_PRESTATIONS = 3;

type Status = 'idle' | 'loading' | 'success' | 'error';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// ─── Helpers date ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

/** Parse "30 min" → 30, "1 h" → 60, "1 h 30" → 90 */
function parseDureeLocal(duree: string): number {
  let minutes = 0;
  const hMatch = duree.match(/(\d+)\s*h/i);
  const mMatch = duree.match(/(\d+)\s*min/i);
  if (hMatch) minutes += parseInt(hMatch[1]) * 60;
  if (mMatch) minutes += parseInt(mMatch[1]);
  return minutes || 30;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ReservationForm() {
  const { data: session } = useSession();
  const isConnected = !!session?.user;

  // ── Données ──────────────────────────────────────────────────────────────
  const [prestations,  setPrestations]  = useState<Prestation[]>([]);
  const [staff,        setStaff]        = useState<StaffMember[]>([]);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [loadingP,     setLoadingP]     = useState(true);
  const [lastPrestaId, setLastPrestaId] = useState<string>('');

  // ── Créneaux ─────────────────────────────────────────────────────────────
  const [slots,        setSlots]        = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dureeMinutes, setDureeMinutes] = useState(30);

  // ── Calendrier mini ──────────────────────────────────────────────────────
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // ── Formulaire ───────────────────────────────────────────────────────────
  const [form,   setForm]   = useState<FormState>({
    prenom: '', email: '', telephone: '',
    date: '', heure: '', prestationIds: [], employeId: '', pourQui: 'moi',
    autrePrenom: '', autreNom: '',
  });
  const [status,        setStatus]        = useState<Status>('idle');
  const [errMsg,        setErrMsg]        = useState('');
  const [createdNumero, setCreatedNumero] = useState<string>('');

  // ─── 1. Chargement des prestations + staff ─────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/prestations').then(r => r.json()),
      fetch('/api/staff').then(r => r.json()),
    ])
      .then(([prestas, staffData]) => {
        setPrestations(Array.isArray(prestas) ? prestas : []);
        setStaff(Array.isArray(staffData) ? staffData : []);
      })
      .catch(console.error)
      .finally(() => setLoadingP(false));
  }, []);

  // ─── 2. Chargement du profil + dernière réservation (si connecté) ───────────
  useEffect(() => {
    if (!isConnected) return;

    fetch('/api/me')
      .then(r => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setForm(f => ({
          ...f,
          prenom:    data.prenom    || f.prenom,
          email:     data.email     || f.email,
          telephone: data.telephone || f.telephone,
        }));
      })
      .catch(console.error);

    fetch('/api/reservations?limit=1')
      .then(r => r.json())
      .then((rdvs: any[]) => {
        if (!Array.isArray(rdvs) || rdvs.length === 0) return;
        if (rdvs[0].prestations?.length > 0) {
          setLastPrestaId(rdvs[0].prestations[0]);
        }
      })
      .catch(console.error);
  }, [isConnected]);

  // ─── 3. Pré-remplir la prestation ──────────────────────────────────────────
  useEffect(() => {
    if (!lastPrestaId || prestations.length === 0) return;
    const found = prestations.find(p => p.nom === lastPrestaId);
    if (found) {
      setForm(f => f.prestationIds.length === 0
        ? { ...f, prestationIds: [found._id] }
        : f
      );
    }
  }, [lastPrestaId, prestations]);

  // ─── Calcul de la durée totale à partir des prestations choisies ─────────
  const computedDuree = useMemo(() => {
    if (form.prestationIds.length === 0) return 30;
    return form.prestationIds.reduce((sum, id) => {
      const p = prestations.find(x => x._id === id);
      return sum + (p ? parseDureeLocal(p.duree) : 0);
    }, 0) || 30;
  }, [form.prestationIds, prestations]);

  // ─── 4. Charger les créneaux quand date + prestations + employé changent ───
  useEffect(() => {
    if (!form.date || form.prestationIds.length === 0) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setForm(f => ({ ...f, heure: '' }));

    const params = new URLSearchParams({
      date:         form.date,
      dureeMinutes: String(computedDuree),
    });
    if (form.employeId) params.set('employeId', form.employeId);

    fetch(`/api/slots?${params}`)
      .then(r => r.json())
      .then(data => {
        setSlots(data.slots ?? []);
        setDureeMinutes(data.dureeMinutes ?? computedDuree);
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.prestationIds, form.employeId, computedDuree]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const resolvePourQui = (): string => {
    if (form.pourQui === 'moi') return form.prenom || 'moi';
    if (form.pourQui === 'nouveau') return `${form.autrePrenom} ${form.autreNom}`.trim() || 'Autre personne';
    const idx = parseInt(form.pourQui.replace('autre-', ''));
    const p = profile?.autresPersonnes?.[idx];
    return p ? `${p.prenom} ${p.nom}` : 'Autre';
  };

  // ─── Soumission ────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrMsg('');

    const prestationsSelectionnees = form.prestationIds
      .map(id => prestations.find(p => p._id === id))
      .filter((p): p is Prestation => !!p);

    try {
      const res = await fetch('/api/reservations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientNom:    form.prenom,
          clientEmail:  form.email,
          clientTel:    form.telephone,
          pourQui:      resolvePourQui(),
          prestations:  prestationsSelectionnees.map(p => p.nom),
          dureeMinutes: dureeMinutes,
          date:         new Date(`${form.date}T${form.heure}:00`).toISOString(),
          employeId:    form.employeId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'blackliste') {
          setErrMsg('La réservation en ligne n\'est pas disponible pour votre compte. Veuillez contacter le salon par téléphone.');
        } else {
          setErrMsg(data.error ?? 'Une erreur est survenue.');
        }
        setStatus('error');
      } else {
        setCreatedNumero(data.numero ?? '');
        setStatus('success');
      }
    } catch {
      setErrMsg('Erreur réseau. Vérifiez votre connexion.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrMsg('');
    setCreatedNumero('');
    setForm(f => ({ ...f, date: '', heure: '', prestationIds: [], employeId: '', pourQui: 'moi', autrePrenom: '', autreNom: '' }));
  };

  // ─── Mini calendrier ──────────────────────────────────────────────────────
  const renderCalendar = () => {
    const { year, month } = calMonth;
    const firstDay  = new Date(year, month, 1).getDay(); // 0=dim
    const daysCount = new Date(year, month + 1, 0).getDate();
    const today     = todayStr();

    const cells: React.ReactNode[] = [];
    // Cases vides avant le 1er
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // lundi = 0
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`e${i}`} />);
    }
    // Jours du mois
    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const isSunday = dateObj.getDay() === 0;
      const isPast  = dateStr < today;
      const isDisabled = isPast || isSunday;
      const isSelected = form.date === dateStr;

      cells.push(
        <button
          key={d}
          type="button"
          disabled={isDisabled}
          onClick={() => setForm(f => ({ ...f, date: dateStr, heure: '' }))}
          className={`w-9 h-9 rounded-full text-sm font-body transition-colors
            ${isSelected
              ? 'bg-yellow-400 text-gray-900 font-bold'
              : isDisabled
                ? 'text-white/15 cursor-not-allowed'
                : 'text-white/70 hover:bg-white/10'
            }`}
        >
          {d}
        </button>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setCalMonth(c => {
            const d = new Date(c.year, c.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })} className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-body text-sm text-white/80">
            {MOIS[month]} {year}
          </span>
          <button type="button" onClick={() => setCalMonth(c => {
            const d = new Date(c.year, c.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })} className="text-white/40 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(j => (
            <div key={j} className="text-[10px] text-yellow-400/50 font-body">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {cells}
        </div>
      </div>
    );
  };

  // ─── Grille de créneaux ───────────────────────────────────────────────────
  const renderSlots = () => {
    if (!form.date) {
      return <p className="text-white/30 text-xs font-body">Sélectionnez d'abord une date.</p>;
    }
    if (loadingSlots) {
      return (
        <div className="flex items-center gap-2 text-white/40 text-xs py-2">
          <Loader2 size={12} className="animate-spin" /> Chargement des créneaux...
        </div>
      );
    }
    if (slots.length === 0) {
      return <p className="text-white/30 text-xs font-body">Aucun créneau disponible.</p>;
    }

    const hasAvailable = slots.some(s => s.disponible);
    if (!hasAvailable) {
      return <p className="text-red-400/80 text-xs font-body">Aucun créneau disponible pour cette date.</p>;
    }

    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {slots.map(slot => (
          <button
            key={slot.heure}
            type="button"
            disabled={!slot.disponible}
            onClick={() => setForm(f => ({ ...f, heure: slot.heure }))}
            className={`py-2 rounded text-sm font-body transition-colors
              ${form.heure === slot.heure
                ? 'bg-yellow-400 text-gray-900 font-bold'
                : slot.disponible
                  ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  : 'bg-white/5 text-white/15 cursor-not-allowed line-through'
              }`}
          >
            {slot.heure}
          </button>
        ))}
      </div>
    );
  };

  // ─── Écran succès ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <SectionTitle className="mb-10">Prendre RDV</SectionTitle>
          <div
            className="rounded overflow-hidden"
            style={{ border: '1px solid rgba(212,160,23,0.5)' }}
          >
            <div className="bg-gray-900 p-12 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <span className="text-yellow-400 text-3xl">★</span>
              </div>
              <p className="font-display text-white text-xl tracking-widest uppercase">
                Réservation confirmée !
              </p>

              {createdNumero && (
                <div className="mt-2 px-6 py-3 rounded border border-yellow-400/40 bg-yellow-400/5">
                  <p className="font-body text-[10px] uppercase tracking-widest text-white/50 mb-1">
                    Numéro de réservation
                  </p>
                  <p className="font-display text-2xl tracking-[0.3em] text-yellow-400 tabular-nums">
                    {createdNumero}
                  </p>
                </div>
              )}

              <p className="text-white/60 text-sm max-w-sm leading-relaxed">
                Nous vous confirmerons votre rendez-vous par email à <span className="text-yellow-400">{form.email}</span>.
                {createdNumero && ' Conservez ce numéro pour toute correspondance.'}
              </p>

              {!isConnected && (
                <div
                  className="mt-4 p-5 rounded w-full max-w-sm text-left"
                  style={{ backgroundColor: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)' }}
                >
                  <p className="font-body text-sm text-white/80 mb-4 leading-relaxed">
                    Créez un compte pour suivre vos réservations, modifier vos rendez-vous et accéder à votre historique.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/inscription?prenom=${encodeURIComponent(form.prenom)}&email=${encodeURIComponent(form.email)}`}
                      className="btn-gold text-xs px-6 py-2.5 text-center flex items-center justify-center gap-2"
                    >
                      <UserPlus size={14} /> Créer mon compte
                    </Link>
                    <Link
                      href="/connexion"
                      className="btn-gold-outline text-xs px-6 py-2.5 text-center"
                    >
                      J'ai déjà un compte
                    </Link>
                  </div>
                </div>
              )}

              {isConnected && (
                <Link href="/compte/reservations" className="btn-gold-outline text-xs px-6 py-2.5 mt-2">
                  Voir mes réservations
                </Link>
              )}

              <button onClick={reset} className="font-body text-xs text-white/30 hover:text-white/60 transition-colors mt-2">
                Prendre un autre rendez-vous
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ─── Client blacklisté ────────────────────────────────────────────────────
  if (profile?.blackliste) {
    return (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <SectionTitle className="mb-10">Prendre RDV</SectionTitle>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <X size={24} className="text-red-400" />
            </div>
            <h3 className="font-body text-lg font-semibold text-gray-900 mb-2">
              Réservation en ligne indisponible
            </h3>
            <p className="font-body text-sm text-gray-500 max-w-md mx-auto">
              La prise de rendez-vous en ligne n&apos;est pas disponible pour votre compte.
              Veuillez contacter le salon directement par téléphone pour prendre rendez-vous.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ─── Formulaire principal ──────────────────────────────────────────────────
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <SectionTitle className="mb-10">Prendre RDV</SectionTitle>

        <div
          className="relative rounded overflow-hidden"
          style={{ border: '1px solid rgba(212,160,23,0.5)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">

            {/* Photo latérale */}
            <div className="relative hidden md:block">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80)' }}
              />
              <div className="absolute inset-0 bg-black/30" />
              {isConnected && profile && (
                <div className="absolute bottom-6 left-0 right-0 px-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-3 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                      <User size={11} className="text-gray-900" />
                    </div>
                    <span className="font-body text-xs text-yellow-300">{profile.prenom}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Formulaire */}
            <div className="bg-gray-900 p-8">
              <p className="font-body text-white/70 text-sm mb-6">Complétez ce formulaire :</p>

              <form onSubmit={submit} className="flex flex-col gap-5">

                {/* ── Bloc identité ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-yellow-400/70 text-xs font-body mb-1.5 block">Prénom *</label>
                    <input
                      name="prenom" value={form.prenom} onChange={handle} required
                      placeholder="Prénom"
                      className="input-gold text-white w-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                  <div>
                    <label className="text-yellow-400/70 text-xs font-body mb-1.5 block">Email *</label>
                    <input
                      name="email" type="email" value={form.email} onChange={handle} required
                      placeholder="Email"
                      className="input-gold text-white w-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-yellow-400/70 text-xs font-body mb-1.5 block">Téléphone</label>
                    <input
                      name="telephone" value={form.telephone} onChange={handle}
                      placeholder="+596 696 ..."
                      className="input-gold text-white w-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                </div>

                {/* ── Prestations (jusqu'à 3 — AVANT la date pour calculer les créneaux) ── */}
                <div>
                  <label className="text-yellow-400/70 text-xs font-body mb-1.5 block">
                    Prestation{form.prestationIds.length > 1 ? 's' : ''} *
                    <span className="text-white/30 font-body text-[10px] normal-case ml-1.5">
                      (jusqu'à {MAX_PRESTATIONS})
                    </span>
                  </label>

                  {loadingP ? (
                    <div className="flex items-center gap-2 text-white/40 text-xs py-2">
                      <Loader2 size={12} className="animate-spin" /> Chargement...
                    </div>
                  ) : (
                    <>
                      {/* Puces des prestations sélectionnées */}
                      {form.prestationIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {form.prestationIds.map(id => {
                            const p = prestations.find(x => x._id === id);
                            if (!p) return null;
                            return (
                              <span key={id}
                                className="inline-flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/40
                                  text-yellow-300 font-body text-xs px-2.5 py-1 rounded-full">
                                {p.nom} · {p.prix}€
                                <button
                                  type="button"
                                  onClick={() => setForm(f => ({
                                    ...f,
                                    prestationIds: f.prestationIds.filter(x => x !== id),
                                  }))}
                                  className="text-yellow-400/60 hover:text-yellow-400"
                                  aria-label="Retirer"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Sélecteur pour en ajouter une */}
                      {form.prestationIds.length < MAX_PRESTATIONS && (
                        <div className="relative">
                          <select
                            value=""
                            onChange={e => {
                              const id = e.target.value;
                              if (!id) return;
                              setForm(f => f.prestationIds.includes(id)
                                ? f
                                : { ...f, prestationIds: [...f.prestationIds, id] }
                              );
                            }}
                            className="input-gold text-white w-full appearance-none pr-8"
                            style={{ backgroundColor: 'rgba(30,25,15,0.9)' }}
                          >
                            <option value="">
                              {form.prestationIds.length === 0
                                ? 'Choisir une prestation...'
                                : 'Ajouter une autre prestation...'}
                            </option>
                            {Array.from(new Set(prestations.map(p => p.categorie).filter(Boolean))).map(cat => {
                              const group = prestations.filter(
                                p => p.categorie === cat && !form.prestationIds.includes(p._id)
                              );
                              if (group.length === 0) return null;
                              return (
                                <optgroup key={cat} label={`── ${cat} ──`}>
                                  {group.map(p => (
                                    <option key={p._id} value={p._id}>
                                      {p.nom} — {p.prix}€ ({p.duree})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                          <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400/60 pointer-events-none" />
                        </div>
                      )}

                      {/* Récapitulatif durée totale */}
                      {form.prestationIds.length > 0 && (
                        <p className="text-yellow-400/50 text-[11px] font-body mt-1.5">
                          Durée totale : {computedDuree} min
                        </p>
                      )}
                    </>
                  )}

                  {isConnected && form.prestationIds.length === 1 && lastPrestaId && (
                    <p className="text-yellow-400/50 text-xs font-body mt-1.5 flex items-center gap-1">
                      <span>↩</span> Pré-rempli depuis votre dernière réservation
                    </p>
                  )}
                </div>

                {/* ── Choix du coiffeur ── */}
                {staff.length > 0 && (
                  <div>
                    <label className="text-yellow-400/70 text-xs font-body mb-1.5 flex items-center gap-1.5">
                      <Scissors size={11} className="text-yellow-400" />
                      Coiffeur
                    </label>
                    <div className="relative">
                      <select
                        name="employeId" value={form.employeId}
                        onChange={handle}
                        className="input-gold text-white w-full appearance-none pr-8"
                        style={{ backgroundColor: 'rgba(30,25,15,0.9)' }}
                      >
                        <option value="">Pas de préférence</option>
                        {staff.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.prenom} {s.nom}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400/60 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* ── Date : mini calendrier ── */}
                <div>
                  <label className="text-yellow-400/70 text-xs font-body mb-2 flex items-center gap-1.5">
                    <Calendar size={11} className="text-yellow-400" />
                    Date *
                  </label>
                  {renderCalendar()}
                </div>

                {/* ── Créneaux horaires ── */}
                <div>
                  <label className="text-yellow-400/70 text-xs font-body mb-2 block">
                    Heure *
                  </label>
                  {form.prestationIds.length > 0
                    ? renderSlots()
                    : <p className="text-white/30 text-xs font-body">Sélectionnez d'abord une prestation.</p>
                  }
                </div>

                {/* ── Pour qui ── */}
                <div>
                  <label className="text-yellow-400/70 text-xs font-body mb-1.5 flex items-center gap-1.5">
                    <Users size={11} className="text-yellow-400" />
                    Pour qui est ce rendez-vous ?
                  </label>
                  <div className="relative">
                    <select
                      name="pourQui" value={form.pourQui}
                      onChange={handle}
                      className="input-gold text-white w-full appearance-none pr-8"
                      style={{ backgroundColor: 'rgba(30,25,15,0.9)' }}
                    >
                      <option value="moi">
                        {form.prenom ? `Pour moi (${form.prenom})` : 'Pour moi'}
                      </option>
                      {isConnected && profile?.autresPersonnes && profile.autresPersonnes.length > 0 && (
                        <optgroup label="── Mes proches ──">
                          {profile.autresPersonnes.map((p, i) => (
                            <option key={i} value={`autre-${i}`}>
                              {p.prenom} {p.nom}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="nouveau">Autre personne...</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400/60 pointer-events-none" />
                  </div>

                  {form.pourQui === 'nouveau' && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-white/40 text-xs font-body mb-1 block">Prénom *</label>
                        <input
                          name="autrePrenom" value={form.autrePrenom} onChange={handle}
                          placeholder="Prénom" required
                          className="input-gold text-white w-full text-sm"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        />
                      </div>
                      <div>
                        <label className="text-white/40 text-xs font-body mb-1 block">Nom</label>
                        <input
                          name="autreNom" value={form.autreNom} onChange={handle}
                          placeholder="Nom"
                          className="input-gold text-white w-full text-sm"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        />
                      </div>
                      {isConnected && form.autrePrenom && (
                        <p className="col-span-2 text-yellow-400/50 text-xs font-body">
                          Vous pouvez ajouter cette personne dans{' '}
                          <Link href="/compte/informations" className="underline hover:text-yellow-400">
                            Mes informations
                          </Link>.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Erreur ── */}
                {status === 'error' && (
                  <p className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2">{errMsg}</p>
                )}

                {/* ── Submit ── */}
                <button
                  type="submit"
                  disabled={status === 'loading' || !form.heure}
                  className="btn-gold w-full mt-1 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {status === 'loading'
                    ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours...</>
                    : 'Réserver Maintenant'
                  }
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
