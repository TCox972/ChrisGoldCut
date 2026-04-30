import { MapPin, Phone, Mail } from 'lucide-react';
import { Icon } from '@iconify/react';
import { horaires } from '@/lib/data';

export default function ContactInfo() {
  return (
    <section className="bg-dark-800 py-16 px-6" style={{ backgroundColor: '#111111' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-yellow-400" />
          <span className="font-display text-xs tracking-[0.2em] text-yellow-400 uppercase">Retrouvez-nous</span>
        </div>
        <h2 className="font-display text-4xl font-black tracking-widest text-white mb-10 uppercase">DUCOS</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Address */}
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-white/80 text-sm font-body">Impasse de la Sablière</p>
                <p className="text-white/80 text-sm font-body">Bourg</p>
                <p className="text-white/80 text-sm font-body">97224 DUCOS</p>
                <p className="text-white/50 text-xs font-body mt-1">Salon</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-white/80 text-sm">+596 (0)696 10 20 30</p>
                <p className="text-white/50 text-xs">Ligne directe</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-white/80 text-sm">info@goldcut.com</p>
                <p className="text-white/50 text-xs">Mail</p>
              </div>
            </div>
            <div className="flex items-center text-yellow-400 gap-4 mt-2">
              <a href="https://www.instagram.com/gold_cut777?igsh=MWdmbDF0YWpiNWxibw==" target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                <Icon icon="cib:instagram" width="24" height="24" />
              </a>
              <a href="https://wa.me/+596696102030" target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                <Icon icon="cib:whatsapp" width="24" height="24" />
              </a>
            </div>
          </div>

          {/* Horaires */}
          <div>
            <table className="w-full text-sm font-body">
              <tbody>
                {horaires.map(h => (
                  <tr key={h.jour} className="border-b border-white/5">
                    <td className="py-2 pr-6 text-white/70 w-12">{h.jour}</td>
                    <td className={`py-2 ${h.horaire === 'Fermé' ? 'text-white/40' : 'text-white/80'}`}>{h.horaire}</td>
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
