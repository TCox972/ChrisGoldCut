// ─── Génération d'événement calendrier (iCalendar .ics) ──────────────────────
// Les dates de RDV sont stockées comme "heure murale du salon" interprétée en
// UTC (cf. lib/slots.ts). Le salon est en Martinique (UTC-4, sans heure d'été).
// Pour obtenir l'instant UTC réel, on ajoute donc 4 h aux composantes UTC stockées.
// Ex : RDV à 10:00 (Martinique) stocké "T10:00:00Z" → instant réel 14:00 UTC.

const MARTINIQUE_OFFSET_H = 4;

const SALON_TEL  = '+596 696 02 84 00';
const SALON_ADDR = '2 Impasse de la Sablière, 97224 DUCOS, Martinique';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formate un instant UTC réel en YYYYMMDDTHHMMSSZ. */
function fmtUtcInstant(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Convertit une date "heure murale salon" (composantes UTC) en instant UTC réel formaté. */
function fmtSalonAsUtc(d: Date): string {
  return fmtUtcInstant(new Date(d.getTime() + MARTINIQUE_OFFSET_H * 3600 * 1000));
}

function escapeIcs(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export type IcsRdv = {
  numero: string;
  date: Date | string;
  dureeMinutes: number;
  prestations: string[];
  /** Lien pour gérer / annuler le RDV (ex. {origin}/mes-rdv/{id}) */
  manageUrl: string;
};

/** Description texte commune (calendrier + Google Agenda). */
function buildDescription(rdv: IcsRdv): string {
  return [
    `Réservation Gold Cut n°${rdv.numero}`,
    `Prestation(s) : ${rdv.prestations.join(', ') || '—'}`,
    `Salon : ${SALON_ADDR}`,
    `Téléphone : ${SALON_TEL}`,
    `Annuler / modifier le rendez-vous : ${rdv.manageUrl}`,
  ].join('\n');
}

/** Génère le contenu d'un fichier .ics pour un rendez-vous. */
export function buildRdvIcs(rdv: IcsRdv): string {
  const start = new Date(rdv.date);
  const end   = new Date(start.getTime() + (rdv.dureeMinutes || 30) * 60000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gold Cut//Reservation//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${rdv.numero}@goldcut`,
    `DTSTAMP:${fmtUtcInstant(new Date())}`,
    `DTSTART:${fmtSalonAsUtc(start)}`,
    `DTEND:${fmtSalonAsUtc(end)}`,
    `SUMMARY:${escapeIcs(`Gold Cut — RDV #${rdv.numero}`)}`,
    `LOCATION:${escapeIcs(SALON_ADDR)}`,
    `DESCRIPTION:${escapeIcs(buildDescription(rdv))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // iCalendar exige des fins de ligne CRLF.
  return lines.join('\r\n');
}

/** Lien "Ajouter à Google Agenda" (pré-rempli). */
export function buildGoogleCalUrl(rdv: IcsRdv): string {
  const start = new Date(rdv.date);
  const end   = new Date(start.getTime() + (rdv.dureeMinutes || 30) * 60000);
  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    `Gold Cut — RDV #${rdv.numero}`,
    dates:   `${fmtSalonAsUtc(start)}/${fmtSalonAsUtc(end)}`,
    details: buildDescription(rdv),
    location: SALON_ADDR,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
