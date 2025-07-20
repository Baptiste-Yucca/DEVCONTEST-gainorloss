/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuration pour les variables d'environnement
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  },
  
  // Configuration des images
  images: {
    domains: ['api.gnosisscan.io'],
  },
  
  // Configuration des en-têtes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Configuration pour le développement
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour le développement
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig; 