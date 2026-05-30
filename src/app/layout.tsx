import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WebSiteJsonLd, OrganizationJsonLd } from '@/components/seo/JsonLd';
import GeoProvider from '@/components/geo/GeoProvider';
import CookieBanner from '@/components/cookies/CookieBanner';
import SellButton from '@/components/ui/SellButton';
import PushPermissionBanner from '@/components/notifications/PushPermissionBanner';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5B2D8E',
};

export const metadata: Metadata = {
  title: 'COMPREOUVENDA.COM - Compre, Venda, Compartilhe',
  description: 'Marketplace moderno com vídeos gerados por IA, geolocalização, comissões e doações para instituições beneficentes. Compre e venda perto de você.',
  keywords: ['marketplace', 'comprar', 'vender', 'classificados', 'vídeo ia', 'doação', 'comissão', 'pix', 'brasil'],
  authors: [{ name: 'COMPREOUVENDA.COM' }],
  creator: 'COMPREOUVENDA.COM',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CompreOuVenda',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://compreouvenda.vercel.app',
    siteName: 'COMPREOUVENDA.COM',
    title: 'COMPREOUVENDA.COM - Marketplace com Vídeo IA',
    description: 'Compre e venda com vídeos gerados por IA, geolocalização, pagamento via PIX e doações para instituições.',
    images: [{ url: '/logo-full.png', width: 1280, height: 853, alt: 'COMPREOUVENDA.COM' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COMPREOUVENDA.COM',
    description: 'Marketplace com Vídeo IA, PIX e doações beneficentes',
    images: ['/logo-full.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Preconnect for faster external resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://supabase.co" />
        <WebSiteJsonLd />
        <OrganizationJsonLd />
      </head>
      <body className="min-h-screen">
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-brand-purple focus:text-white focus:rounded-xl focus:font-semibold"
        >
          Pular para o conteúdo
        </a>
        <GeoProvider>
          {children}
        </GeoProvider>
        {/* Cookie banner fora do GeoProvider para não depender de geolocalização */}
        <CookieBanner />
        {/* Push notification permission banner */}
        <PushPermissionBanner />
        {/* Global FAB - Anunciar Agora (hidden on /product/new) */}
        <SellButton />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
