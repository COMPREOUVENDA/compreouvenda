/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── IMPORTANTE: Nunca coloque segredos diretamente aqui. ──
  // Todas as chaves devem ser carregadas via .env.local ou Variáveis de Ambiente da Vercel.
  // Variáveis obrigatórias:
  //   NEXT_PUBLIC_SUPABASE_URL
  //   NEXT_PUBLIC_SUPABASE_ANON_KEY
  //   NEXT_PUBLIC_VAPID_PUBLIC_KEY
  //   VAPID_PRIVATE_KEY
  //   VAPID_SUBJECT
  //   SUPABASE_SERVICE_ROLE_KEY
  //   CRON_SECRET
  //   PAYMENT_GATEWAY_SECRET_KEY   (chave secreta do gateway de pagamento)
  //   PAYMENT_GATEWAY_PUBLIC_KEY   (chave pública do gateway de pagamento)
  eslint: {
    ignoreDuringBuilds: false, // falhar o build se houver erros de ESLint
  },
  typescript: {
    ignoreBuildErrors: false, // falhar o build se houver erros de TypeScript
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // imagens do Supabase Storage
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // imagens de exemplo
      },
      {
        protocol: 'https',
        hostname: 'chart.googleapis.com', // QR codes do Google Charts
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // avatares do Google
      },
    ],
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
