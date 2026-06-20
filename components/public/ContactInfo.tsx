import { MapPin, Phone, Mail } from 'lucide-react';
import { Icon } from '@iconify/react';
import { horaires } from '@/lib/data';

export default function ContactInfo() {
  return (
    <section className="bg-dark-800 py-16 px-6" style={{ backgroundColor: '#111111' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header centré sur mobile, aligné à gauche sur desktop */}
        <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
          <MapPin size={16} className="text-yellow-400" />
          <span className="font-display text-xs tracking-[0.2em] text-yellow-400 uppercase">Retrouvez-nous</span>
        </div>
        <h2 className="font-display text-4xl md:text-4xl font-black tracking-widest text-white mb-10 uppercase text-center md:text-left">
          DUCOS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-10">
          {/* Address + tel + mail + réseaux */}
          <div className="flex flex-col gap-6 md:gap-5 items-center md:items-start text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
              <MapPin size={22} className="text-yellow-400 md:mt-1 flex-shrink-0" />
              <div>
                <p className="text-white/90 text-lg md:text-sm font-body font-semibold md:font-normal">Impasse de la Sablière</p>
                <p className="text-white/90 text-lg md:text-sm font-body font-semibold md:font-normal">Bourg</p>
                <p className="text-white/90 text-lg md:text-sm font-body font-semibold md:font-normal">97224 DUCOS</p>
                <p className="text-white/50 text-sm md:text-xs font-body mt-1">Salon</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-center gap-3">
              <Phone size={22} className="text-yellow-400 flex-shrink-0" />
              <div>
                <a href="tel:+596696102030" className="text-white/90 text-lg md:text-sm font-semibold md:font-normal hover:text-yellow-300 transition-colors">
                  +596 (0)696 10 20 30
                </a>
                <p className="text-white/50 text-sm md:text-xs">Ligne directe</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-center gap-3">
              <Mail size={22} className="text-yellow-400 flex-shrink-0" />
              <div>
                <a href="mailto:info@goldcut.com" className="text-white/90 text-lg md:text-sm font-semibold md:font-normal break-all hover:text-yellow-300 transition-colors">
                  info@goldcut.com
                </a>
                <p className="text-white/50 text-sm md:text-xs">Mail</p>
              </div>
            </div>

            <div className="flex items-center text-yellow-400 gap-6 md:gap-4 mt-2">
              <a href="https://www.instagram.com/gold_cut777?igsh=MWdmbDF0YWpiNWxibw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-70">
                <Icon icon="cib:instagram" width="32" height="32" className="md:!w-6 md:!h-6" />
              </a>
              <a href="https://wa.me/+596696102030" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:opacity-70">
                <Icon icon="cib:whatsapp" width="32" height="32" className="md:!w-6 md:!h-6" />
              </a>
            </div>
          </div>

          {/* Horaires */}
          <div className="flex justify-center md:justify-start">
            <table className="w-full max-w-xs md:max-w-none text-base md:text-sm font-body">
              <tbody>
                {horaires.map(h => (
                  <tr key={h.jour} className="border-b border-white/5">
                    <td className="py-3 md:py-2 pr-6 text-white/80 md:text-white/70 font-medium md:font-normal w-20 md:w-12">{h.jour}</td>
                    <td className={`py-3 md:py-2 text-right md:text-left ${h.horaire === 'Fermé' ? 'text-white/40 italic' : 'text-white/90 md:text-white/80'}`}>{h.horaire}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Map placeholder */}
          <div className="rounded overflow-hidden h-48 md:h-full min-h-36 relative" style={{ filter: 'brightness(0.6) sepia(0.3)' }}>
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={32} className="text-yellow-400 mx-auto mb-2" />
                <p className="text-white/60 text-xs">Impasse de la Sablière</p>
                <p className="text-white/60 text-xs">97224 DUCOS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
