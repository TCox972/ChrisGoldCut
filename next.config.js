/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'res.cloudinary.com'],
  },
  // Le SDK Cloudinary utilise des require dynamiques (lodash/isArray, etc.) que
  // Webpack ne peut pas tracer au build. On l'exclut du bundling serveur pour
  // qu'il soit chargé via le require natif de Node.js au runtime.
  experimental: {
    serverComponentsExternalPackages: ['cloudinary'],
  },

  // En-têtes de sécurité appliqués à toutes les routes.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Anti-clickjacking : le site ne peut pas être affiché dans une iframe tierce.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Empêche le navigateur de "deviner" le type MIME.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Ne fuite pas l'URL complète vers les sites externes.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restreint l'accès aux API sensibles du navigateur.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS (effectif uniquement quand le site est servi en HTTPS).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
