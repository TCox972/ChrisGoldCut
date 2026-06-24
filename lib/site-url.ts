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
