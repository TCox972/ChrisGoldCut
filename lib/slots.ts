// ─── Constantes horaires ─────────────────────────────────────────────────────
export const OPEN_HOUR = 9;   // 9h00
export const CLOSE_HOUR = 19; // 19h00 (dernier créneau : 18h30)
export const STEP = 30;       // créneaux de 30 min

// ─── Génère tous les créneaux de la journée ─────────────────────────────────
export function generateAllSlots(): string[] {
  const slots: string[] = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += STEP) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

// ─── Parse une durée texte en minutes ────────────────────────────────────────
// "30 min" → 30, "1 h" → 60, "1 h 30" → 90, "45 min" → 45
export function parseDuree(duree: string): number {
  let minutes = 0;
  const hMatch = duree.match(/(\d+)\s*h/i);
  const mMatch = duree.match(/(\d+)\s*min/i);
  if (hMatch) minutes += parseInt(hMatch[1]) * 60;
  if (mMatch) minutes += parseInt(mMatch[1]);
  return minutes || 30;
}

// ─── Nombre de créneaux bloqués par une prestation ──────────────────────────
// Robuste à un input null/undefined/NaN : on tombe sur 30 min par défaut
// pour ne jamais retourner NaN (qui ferait crasher la boucle d'occupation).
export function slotsNeeded(dureeMinutes: number): number {
  const m = Number.isFinite(dureeMinutes) && dureeMinutes > 0 ? dureeMinutes : 30;
  return Math.ceil(m / STEP);
}

// ─── Extrait l'heure "HH:MM" d'un objet Date ───────────────────────────────
// Utilise getUTCHours/Minutes : les dates de réservation sont stockées comme
// "heure murale du salon" interprétée en UTC. Cela rend la logique TZ-indépendante
// (fonctionne quel que soit le fuseau du serveur ou du navigateur).
export function dateToSlot(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

// ─── Crée les créneaux occupés à partir des réservations ────────────────────
export function getOccupiedSlots(
  reservations: { date: string | Date; dureeMinutes?: number }[]
): Set<string> {
  const allSlots = generateAllSlots();
  const occupied = new Set<string>();

  for (const rdv of reservations) {
    const d = new Date(rdv.date);
    const startSlot = dateToSlot(d);
    const idx = allSlots.indexOf(startSlot);
    if (idx === -1) continue;

    const count = slotsNeeded(rdv.dureeMinutes ?? 30);
    for (let i = 0; i < count; i++) {
      if (idx + i < allSlots.length) {
        occupied.add(allSlots[idx + i]);
      }
    }
  }

  return occupied;
}

// ─── Vérifie si un créneau est disponible ───────────────────────────────────
export function isSlotAvailable(
  slot: string,
  dureeMinutes: number,
  occupiedSlots: Set<string>,
  blockedSlots: Set<string>
): boolean {
  const allSlots = generateAllSlots();
  const idx = allSlots.indexOf(slot);
  if (idx === -1) return false;

  const count = slotsNeeded(dureeMinutes);
  for (let i = 0; i < count; i++) {
    const checkIdx = idx + i;
    if (checkIdx >= allSlots.length) return false;
    const s = allSlots[checkIdx];
    if (occupiedSlots.has(s) || blockedSlots.has(s)) return false;
  }
  return true;
}
