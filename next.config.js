/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── IMPORTANT: Never hardcode secrets here. ──
  // All keys are loaded from .env.local / Vercel Environment Variables.
  // Required variables:
  //   NEXT_PUBLIC_SUPABASE_URL
  //   NEXT_PUBLIC_SUPABASE_ANON_KEY
  //   NEXT_PUBLIC_VAPID_PUBLIC_KEY
  //   VAPID_PRIVATE_KEY
  //   VAPID_SUBJECT
  //   SUPABASE_SERVICE_ROLE_KEY
  //   CRON_SECRET
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
      {
        protocol: 'https',
        hostname: 'chart.googleapis.com',
      },
    ],
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
