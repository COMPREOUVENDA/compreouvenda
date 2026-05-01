import type { Metadata, Viewport } from 'next';
import './globals.css';

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
      </head>
      <body className="min-h-screen">
        {children}
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
