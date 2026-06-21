// ─── Limiteur de débit en mémoire (fenêtre fixe) ─────────────────────────────
// Sans dépendance externe : suffisant pour freiner brute-force et spam sur une
// instance unique. ⚠️ En cas de déploiement multi-instances/serverless, la
// mémoire n'est pas partagée — pour une protection robuste à grande échelle,
// remplacer le `store` par un Redis (ex. Upstash). L'interface resterait la même.

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Nettoyage opportuniste pour éviter une croissance illimitée de la Map.
function cleanup(now: number) {
  if (store.size < 5000) return;
  store.forEach((b, key) => {
    if (now > b.resetAt) store.delete(key);
  });
}

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * @param key       Identifiant du seau (ex. `login:1.2.3.4`).
 * @param limit     Nombre d'appels autorisés dans la fenêtre.
 * @param windowMs  Durée de la fenêtre en millisecondes.
 * @returns ok=false si la limite est dépassée, avec retryAfter en secondes.
 */
export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true, retryAfter: 0 };
}

/** Extrait l'IP cliente depuis les en-têtes de proxy (fallback "unknown"). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/** Variante pour les en-têtes "plain object" (ex. NextAuth authorize). */
export function getIpFromHeaders(headers?: Record<string, string | string[] | undefined>): string {
  if (!headers) return 'unknown';
  const xff = headers['x-forwarded-for'];
  const val = Array.isArray(xff) ? xff[0] : xff;
  if (val) return val.split(',')[0].trim();
  const real = headers['x-real-ip'];
  return (Array.isArray(real) ? real[0] : real) || 'unknown';
}
