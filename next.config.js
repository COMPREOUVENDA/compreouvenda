/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://auxaajrjwbdsnxtvgmsb.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDIxMzMsImV4cCI6MjA5MjgxODEzM30.y7Sv6U7L0APrnQWBb5sKaFw8D-Vq13IiKs1uAP8MC8M',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'rBE4WnZF_5nLltRgx7VLfdNmf6wK97kR3R-eh9lSU7Oa39KT3BORch3xjiWE9al5cW24OHpE9bAhi4ornrtWFQ',
    VAPID_PRIVATE_KEY: 'mt_Sk9wTkXId8Y4lhPWpeXFtuDh6RPWwIYuKK567VhU',
    VAPID_SUBJECT: 'mailto:contato@compreouvenda.com',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Force all pages to be server-rendered (no static generation)
  output: undefined,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
