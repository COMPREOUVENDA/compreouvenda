/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Build ────────────────────────────────────────────────────────────────
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // ─── Otimização de imagens ────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Supabase Storage (imagens de produtos, avatares)
      { protocol: 'https', hostname: '*.supabase.co' },
      // PagBank QR codes e assets
      { protocol: 'https', hostname: '*.pagbank.com.br' },
      { protocol: 'https', hostname: '*.pagseguro.uol.com.br' },
      // Avatares externos
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Assets de exemplo / QR codes
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'chart.googleapis.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
  },

  // ─── Headers de segurança HTTP ────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Impede clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Impede MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Proteção XSS (browsers legados)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy segura
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissões de hardware (câmera para QR scanner, geoloc para feed)
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self), payment=(self)',
          },
          // HSTS — força HTTPS por 1 ano
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: Next.js + analytics + Vercel speed insights
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              // Imagens: próprias + Supabase + avatares + PagBank QR
              "img-src 'self' data: blob: https://*.supabase.co https://ui-avatars.com https://api.dicebear.com https://*.pagbank.com.br https://lh3.googleusercontent.com https://chart.googleapis.com",
              "font-src 'self'",
              // Conexões: Supabase REST + Realtime WS + PagBank API
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.pagbank.com.br https://sandbox.api.pagbank.com.br https://www.google-analytics.com https://va.vercel-scripts.com",
              // Vídeo/áudio do Supabase Storage
              "media-src 'self' blob: https://*.supabase.co",
              // Service Worker
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // Cache imutável para assets estáticos do Next.js
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Cache para imagens otimizadas
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Service Worker — nunca cacheado
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  // ─── Redirecionamentos canônicos ──────────────────────────────────────────
  async redirects() {
    return [
      { source: '/privacidade', destination: '/privacy', permanent: true },
      { source: '/termos',      destination: '/terms',   permanent: true },
    ];
  },
};

module.exports = nextConfig;
