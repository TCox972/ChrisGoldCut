'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Phone, MapPin, Clock, X } from 'lucide-react';
import { horaires } from '@/lib/data';

// ─── Constantes salon ────────────────────────────────────────────────────────
const PHONE_HUMAN = '+596 696 02 84 00';
const PHONE_HREF  = 'tel:+596696028400';
const ADDRESS     = '2 Impasse de la Sablière — 97224 DUCOS';
const MAPS_URL    = 'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Gold Cut, 2 Impasse de la Sablière, 97224 Ducos, Martinique');
const HOURS_SUM   = 'Du mardi au samedi — De 9h à 19h';

const INSTAGRAM_URL = 'https://www.instagram.com/gold_cut777?igsh=MWdmbDF0YWpiNWxibw==';
const WHATSAPP_URL  = 'https://wa.me/+596696028400';

export default function HomeInfoBar() {
  const [hoursOpen, setHoursOpen] = useState(false);

  // Fermeture modale via Échap
  useEffect(() => {
    if (!hoursOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setHoursOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hoursOpen]);

  return (
    <>
      {/* Bandeau jaune fixé en bas du hero */}
      <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/95 backdrop-blur-sm">

        {/* ── Version MOBILE : 3 icônes cliquables + réseaux ── */}
        <div className="md:hidden max-w-5xl mx-auto px-6 py-3 flex items-center justify-around text-gray-900">
          <a
            href={PHONE_HREF}
            aria-label={`Appeler ${PHONE_HUMAN}`}
            title="Appeler le salon"
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <Phone size={22} strokeWidth={2} />
          </a>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Voir sur Google Maps"
            title="Itinéraire Google Maps"
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <MapPin size={22} strokeWidth={2} />
          </a>
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            aria-label="Voir les horaires d'ouverture"
            title="Horaires d'ouverture"
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <Clock size={22} strokeWidth={2} />
          </button>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <Icon icon="cib:instagram" width="22" height="22" />
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <Icon icon="cib:whatsapp" width="22" height="22" />
          </a>
        </div>

        {/* ── Version DESKTOP : texte + réseaux (inchangé) ── */}
        <div className="hidden md:flex max-w-5xl mx-auto px-6 py-3 flex-wrap items-center justify-between gap-4 text-xs font-body font-medium text-gray-900">
          <a href={PHONE_HREF} className="hover:opacity-70 transition-opacity">📞 {PHONE_HUMAN}</a>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">📍 {ADDRESS}</a>
          <button type="button" onClick={() => setHoursOpen(true)} className="hover:opacity-70 transition-opacity">🕐 {HOURS_SUM}</button>
          <div className="flex items-center gap-3">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
              <Icon icon="cib:instagram" width="24" height="24" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
              <Icon icon="cib:whatsapp" width="24" height="24" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Modale horaires ── */}
      {hoursOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setHoursOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="horaires-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg p-7 relative"
            style={{ backgroundColor: 'rgba(30,25,15,0.97)', border: '1px solid rgba(212,160,23,0.3)' }}
          >
            <button
              type="button"
              onClick={() => setHoursOpen(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center mb-3">
                <Clock size={22} className="text-yellow-400" />
              </div>
              <h3 id="horaires-title" className="font-display text-base tracking-widest uppercase text-white font-bold">
                Horaires
              </h3>
            </div>

            <table className="w-full font-body text-sm">
              <tbody>
                {horaires.map(h => (
                  <tr key={h.jour} className="border-b border-white/5">
                    <td className="py-2 pr-6 text-white/70 font-medium w-20">{h.jour}</td>
                    <td className={`py-2 text-right ${h.horaire === 'Fermé' ? 'text-white/40 italic' : 'text-white/90'}`}>
                      {h.horaire}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
