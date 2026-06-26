// ─── URL de base publique du site ────────────────────────────────────────────
// Utilisée pour construire les liens absolus envoyés par email (validation de
// compte, réinitialisation de mot de passe, invitation).
//
// Ordre de résolution (du plus explicite au fallback) :
//   1. NEXT_PUBLIC_APP_URL  — à définir en prod (domaine public exact).
//   2. NEXT_PUBLIC_SITE_URL — déjà utilisé ailleurs (SEO, sitemap).
//   3. VERCEL_URL           — URL de déploiement auto-fournie par Vercel
//                             (évite un lien "localhost" en prod si rien n'est configuré).
//   4. http://localhost:3000 — dernier recours en développement.
export function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';

  // Retire un éventuel slash final pour éviter les doubles slashes ("//verifier-email").
  return raw.replace(/\/+$/, '');
}

/**
 * URL de base dérivée de la requête HTTP entrante (en-têtes `host` +
 * `x-forwarded-proto`). C'est la source la plus fiable en production : elle
 * reflète le vrai domaine utilisé, sans dépendre de variables d'env figées au
 * build (NEXT_PUBLIC_* est inliné au build → peut rester sur "localhost").
 * Retombe sur getBaseUrl() si les en-têtes sont absents.
 */
export function getBaseUrlFromRequest(req: Request): string {
  const host = req.headers.get('host');
  if (!host) return getBaseUrl();
  const proto = req.headers.get('x-forwarded-proto')
    || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Transforme une URL http(s) en URL `webcal://`.
 * Les liens `webcal://` sont remis par le navigateur/OS à l'application calendrier
 * par défaut (Apple Calendar, Outlook…) au lieu de télécharger le fichier .ics.
 */
export function toWebcal(httpUrl: string): string {
  return httpUrl.replace(/^https?:\/\//i, 'webcal://');
}
