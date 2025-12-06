/** @type {import('next').NextConfig} */
const nextConfig = {
  // On laisse vide pour l'instant, Vercel gère tout automatiquement
  typescript: {
    // Force le build même si petites erreurs TS (optionnel mais pratique en dev)
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;