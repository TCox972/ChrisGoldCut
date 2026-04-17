'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Loader2, Calendar, Clock, Scissors, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

type Rdv = {
  _id: string; numero: string;
  clientNom: string; clientEmail: string;
  prestations: string[]; date: string;
  statut: string; dureeMinutes: number;
  pourQui: string;
};

export default function MesRdvPage() {
  const { id } = useParams<{ id: string }>();
  const [rdv, setRdv] = useState<Rdv | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Réservation introuvable');
        return r.json();
      })
      .then(data => setRdv(data))
      .catch(() => setError('Impossible de charger cette réservation. Vérifiez le lien.'))
      .finally(() => setLoading(false));
  }, [id]);

  const annuler = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'annule' }),
      });
      if (res.ok) {
        setCancelled(true);
        setRdv(prev => prev ? { ...prev, statut: 'annule' } : prev);
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'annulation.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatHeure = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isPast = rdv ? new Date(rdv.date).getTime() < Date.now() : false;

  return (
    <main>
      <Navbar dark />
      <div className="relative min-h-screen flex flex-col">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80)' }} />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(20,16,10,0.7)' }} />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-16">
          <div className="w-full max-w-md rounded-lg p-10"
            style={{ backgroundColor: 'rgba(30,25,15,0.92)', border: '1px solid rgba(212,160,23,0.3)' }}>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-white/60 py-8">
                <Loader2 size={18} className="animate-spin" /> Chargement...
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
                <p className="font-body text-sm text-red-400">{error}</p>
                <Link href="/reservation" className="block mt-6 font-body text-sm" style={{ color: '#D4A017' }}>
                  Prendre un nouveau rendez-vous
                </Link>
              </div>
            )}

            {rdv && !loading && (
              <>
                <h1 className="font-display text-xl tracking-[0.25em] uppercase text-white text-center mb-2 font-bold">
                  Mon Rendez-vous
                </h1>
                <p className="font-body text-xs text-white/40 text-center mb-8">Référence #{rdv.numero}</p>

                {/* Statut */}
                {rdv.statut === 'annule' && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-center">
                    <p className="font-body text-sm text-red-400 font-semibold">Ce rendez-vous a été annulé</p>
                  </div>
                )}
                {rdv.statut === 'termine' && (
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-3 mb-6 text-center flex items-center justify-center gap-2">
                    <Check size={14} className="text-green-400" />
                    <p className="font-body text-sm text-green-400 font-semibold">Rendez-vous terminé</p>
                  </div>
                )}
                {cancelled && (
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg px-4 py-3 mb-6 text-center">
                    <p className="font-body text-sm text-yellow-400">Votre rendez-vous a bien été annulé.</p>
                  </div>
                )}

                {/* Détails */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="font-body text-xs text-white/40">Date</p>
                      <p className="font-body text-sm text-white/80">{formatDate(rdv.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="font-body text-xs text-white/40">Heure</p>
                      <p className="font-body text-sm text-white/80">{formatHeure(rdv.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scissors size={16} className="text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="font-body text-xs text-white/40">Prestation(s)</p>
                      <p className="font-body text-sm text-white/80">{rdv.prestations.join(', ')}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {rdv.statut === 'a-venir' && !isPast && !cancelled && (
                  <div className="space-y-3">
                    <Link href={`/reservation`}
                      className="block w-full text-center font-body text-sm font-semibold
                        bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-lg px-4 py-2.5
                        hover:bg-yellow-400/20 transition-colors">
                      Reprendre un nouveau rendez-vous
                    </Link>
                    <button
                      onClick={annuler}
                      disabled={cancelling}
                      className="w-full font-body text-sm font-medium
                        text-red-400 border border-red-400/30 rounded-lg px-4 py-2.5
                        hover:bg-red-400/10 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
                    </button>
                  </div>
                )}

                {(rdv.statut !== 'a-venir' || isPast) && (
                  <Link href="/reservation"
                    className="block w-full text-center font-body text-sm font-semibold mt-4" style={{ color: '#D4A017' }}>
                    Prendre un nouveau rendez-vous
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
