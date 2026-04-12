'use client';

import { useState, useEffect } from 'react';
import { Info, User, Users, Loader2 } from 'lucide-react';

type Client = {
  _id: string; prenom: string; nom: string;
  email: string; telephone: string;
  autresPersonnes: { prenom: string; nom: string }[];
  derniereReservation: { date: string } | null;
};

const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AdminClientsPage() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}
          className="mb-6 flex items-center gap-2 font-body text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Retour aux clients
        </button>
        <h1 className="font-body text-2xl font-bold text-gray-900 mb-6">Fiche Client</h1>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          <div className="p-8 flex items-start gap-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-x-16 gap-y-3">
              {[['Prénom :', selected.prenom],['Nom :', selected.nom],['Email :', selected.email],['Téléphone :', selected.telephone]].map(([label, val]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="font-body text-sm font-semibold text-gray-800 w-28">{label}</span>
                  <span className="font-body text-sm text-gray-600">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
          {selected.autresPersonnes?.length > 0 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-5">
                <Users size={18} className="text-gray-400" />
                <h2 className="font-body text-base font-semibold text-gray-900">Autres personnes rattachées</h2>
              </div>
              <table className="w-full max-w-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="font-body text-xs font-semibold text-gray-500 text-left pb-3 pr-12">Prénom</th>
                  <th className="font-body text-xs font-semibold text-gray-500 text-left pb-3">Nom</th>
                </tr></thead>
                <tbody>
                  {selected.autresPersonnes.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="font-body text-sm text-gray-700 py-3 pr-12">{p.prenom}</td>
                      <td className="font-body text-sm text-gray-700 py-3">{p.nom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-body text-2xl font-bold text-gray-900 mb-6">Clients</h1>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 size={18} className="animate-spin" /> Chargement...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Clients</th>
              <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Email</th>
              <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Téléphone</th>
              <th className="font-body text-xs font-semibold text-gray-500 text-left px-6 py-4">Dern. Réservation</th>
              <th className="px-6 py-4" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-body text-sm text-gray-900 font-medium">{c.prenom} {c.nom}</td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">{c.telephone || '—'}</td>
                  <td className="px-6 py-4 font-body text-sm text-gray-600">
                    {c.derniereReservation ? formatDate(c.derniereReservation.date) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelected(c)} className="text-gray-300 hover:text-gray-600 transition-colors">
                      <Info size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div className="py-16 text-center"><p className="font-body text-sm text-gray-400">Aucun client.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
