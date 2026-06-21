// ─── Règles de robustesse des mots de passe ──────────────────────────────────
// Source unique de vérité partagée entre l'inscription, la réinitialisation et
// le changement de mot de passe (front + back).
//
// Contraintes :
//   • au moins 10 caractères
//   • au moins une majuscule
//   • au moins un chiffre
//   • au moins un caractère spécial

export const PASSWORD_MIN_LENGTH = 10;

/** Message décrivant les règles, affichable côté UI (placeholder, aide…). */
export const PASSWORD_RULES_LABEL =
  'Min. 10 caractères, une majuscule, un chiffre et un caractère spécial.';

/**
 * Valide un mot de passe.
 * @returns `null` si valide, sinon un message d'erreur en français.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial.';
  }
  return null;
}
