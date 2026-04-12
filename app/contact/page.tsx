import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/layout/PageHero';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Icon } from '@iconify/react';
import { horaires } from '@/lib/data';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <main>
      <Navbar dark />
      <PageHero title="Contact" backgroundImage="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80" />

      {/* Coordonnées */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* Infos */}
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-[0.15em] uppercase text-gray-900 mb-6">
                  Nos Coordonnées
                </h2>
                <p className="font-body text-sm text-gray-500 leading-relaxed">
                  N'hésitez pas à nous contacter pour toute question ou pour prendre rendez-vous.
                </p>
              </div>

              {/* Adresse */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}>
                  <MapPin size={18} style={{ color: '#D4A017' }} />
                </div>
                <div>
                  <p className="font-display text-xs tracking-[0.15em] uppercase text-gray-900 font-bold mb-1">Adresse</p>
                  <p className="font-body text-sm text-gray-600">Impasse de la Sablière</p>
                  <p className="font-body text-sm text-gray-600">Bourg</p>
                  <p className="font-body text-sm text-gray-600">97224 DUCOS</p>
                </div>
              </div>

              {/* Téléphone */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}>
                  <Phone size={18} style={{ color: '#D4A017' }} />
                </div>
                <div>
                  <p className="font-display text-xs tracking-[0.15em] uppercase text-gray-900 font-bold mb-1">Téléphone</p>
                  <a href="tel:+596696102030" className="font-body text-sm text-gray-600 hover:text-yellow-600 transition-colors">
                    +596 (0)696 10 20 30
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}>
                  <Mail size={18} style={{ color: '#D4A017' }} />
                </div>
                <div>
                  <p className="font-display text-xs tracking-[0.15em] uppercase text-gray-900 font-bold mb-1">Email</p>
                  <a href="mailto:info@goldcut.com" className="font-body text-sm text-gray-600 hover:text-yellow-600 transition-colors">
                    info@goldcut.com
                  </a>
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="flex items-center gap-4 mt-2">
                <a href="https://www.instagram.com/gold_cut777?igsh=MWdmbDF0YWpiNWxibw==" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)', color: '#D4A017' }}>
                  <Icon icon="cib:instagram" width="20" height="20" />
                </a>
                <a href="https://wa.me/+596696301020" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)', color: '#D4A017' }}>
                  <Icon icon="cib:whatsapp" width="20" height="20" />
                </a>
              </div>
            </div>

            {/* Horaires */}
            <div>
              <div className="rounded-lg p-8" style={{ backgroundColor: '#111111' }}>
                <div className="flex items-center gap-3 mb-6">
                  <Clock size={18} className="text-yellow-400" />
                  <h3 className="font-display text-lg font-bold tracking-[0.15em] uppercase text-white">
                    Horaires
                  </h3>
                </div>

                <table className="w-full text-sm font-body">
                  <tbody>
                    {horaires.map(h => (
                      <tr key={h.jour} className="border-b border-white/5">
                        <td className="py-3 pr-6 text-white/70">{h.jour}</td>
                        <td className={`py-3 text-right ${h.horaire === 'Fermé' ? 'text-white/40' : 'text-white/80'}`}>
                          {h.horaire}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-8">
                  <Link href="/reservation" className="btn-gold w-full block text-center">
                    Réserver en ligne
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Map */}
      <section className="h-72 md:h-96 relative" style={{ backgroundColor: '#222' }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin size={40} className="text-yellow-400 mx-auto mb-3" />
            <p className="text-white/70 text-sm font-body">Impasse de la Sablière</p>
            <p className="text-white/70 text-sm font-body">97224 DUCOS, Martinique</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
