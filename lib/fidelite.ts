// ─── Configuration fidélité ──────────────────────────────────────────────────
// Un point de fidélité n'est accordé que si la réservation génère au moins
// SEUIL_CA euros de chiffre d'affaires en prestations (produits exclus).
// La récompense s'applique tous les PALIER points : remise de REWARD_PERCENT %.
export const FIDELITE_SEUIL_CA      = 25;
export const FIDELITE_PALIER        = 5;
export const FIDELITE_REWARD_PERCENT = 5;

/**
 * Chiffre d'affaires prestations d'une réservation (somme des prix des
 * prestations, produits exclus), calculé depuis une table nom → prix.
 */
export function prestationsTotal(
  prestations: string[] | undefined,
  priceByNom: Map<string, number>,
): number {
  return (prestations ?? []).reduce((s, nom) => s + (priceByNom.get(nom) ?? 0), 0);
}

/** Une réservation ouvre droit à un point de fidélité si son CA prestations ≥ seuil. */
export function estEligibleFidelite(
  prestations: string[] | undefined,
  priceByNom: Map<string, number>,
): boolean {
  return prestationsTotal(prestations, priceByNom) >= FIDELITE_SEUIL_CA;
}
