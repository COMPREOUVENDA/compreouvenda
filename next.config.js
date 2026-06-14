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
  //   PAYMENT_GATEWAY_SECRET_KEY
  //   PAYMENT_GATEWAY_PUBLIC_KEY
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
