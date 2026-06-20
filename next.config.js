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
}

module.exports = nextConfig
