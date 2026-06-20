/**
 * Helpers de gestion des dates "heure murale du salon".
 *
 * Stratégie : on traite TOUTES les dates de réservation comme du **temps UTC**.
 * Le client envoie « 14:00 » sans conversion, le serveur stocke et lit ces
 * valeurs en UTC. Cela garantit que l'heure affichée correspond exactement à
 * ce que voit l'utilisateur, indépendamment du fuseau du serveur (Vercel,
 * Dokploy, Docker = UTC par défaut) ou du fuseau du navigateur du client.
 *
 * À utiliser systématiquement plutôt que `new Date(\`${dateStr}T00:00:00\`)`
 * (qui dépend du TZ du serveur) et `.getHours()` / `.getMinutes()`.
 */

/** "2026-06-20" → Date représentant 00:00:00.000 UTC ce jour-là. */
export function dayStartUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** "2026-06-20" → Date représentant 23:59:59.999 UTC ce jour-là. */
export function dayEndUTC(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/** Date → "YYYY-MM-DD" en utilisant les composantes UTC. */
export function toDateStrUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date → "HH:MM" en UTC. */
export function toSlotUTC(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "2026-06-20" + "14:00" → Date 14:00 UTC ce jour-là. */
export function buildDateUTC(dateStr: string, heure: string): Date {
  return new Date(`${dateStr}T${heure}:00.000Z`);
}
