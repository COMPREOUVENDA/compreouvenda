import type { Product } from '@/types';

// ── WebSite Schema ────────────────────────────────────────────────────────────
export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'COMPREOUVENDA.COM',
    url: 'https://compreouvenda.vercel.app',
    description:
      'Marketplace moderno com vídeos gerados por IA, geolocalização, comissões e doações.',
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://compreouvenda.vercel.app/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Organization Schema ───────────────────────────────────────────────────────
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'COMPREOUVENDA.COM',
    url: 'https://compreouvenda.vercel.app',
    logo: 'https://compreouvenda.vercel.app/logo-full.png',
    description: 'Marketplace com Vídeo IA, PIX e doações beneficentes',
    foundingDate: '2024',
    areaServed: {
      '@type': 'Country',
      name: 'Brazil',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: 'Portuguese',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Product Schema ────────────────────────────────────────────────────────────
interface ProductJsonLdProps {
  product: Product;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const mainImage = product.images?.[0]?.url || product.video_thumbnail || '';
  const price = product.flash_offer_enabled && product.flash_offer_price
    ? product.flash_offer_price
    : product.auction_enabled && product.auction_current_bid
    ? product.auction_current_bid
    : product.price;

  const availability =
    product.status === 'active'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  const conditionMap: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    like_new: 'https://schema.org/LikeNewCondition',
    good: 'https://schema.org/UsedCondition',
    fair: 'https://schema.org/UsedCondition',
    used: 'https://schema.org/UsedCondition',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: mainImage ? [mainImage] : undefined,
    sku: product.id,
    itemCondition: conditionMap[product.condition] || 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url: `https://compreouvenda.vercel.app/product/${product.id}`,
      priceCurrency: 'BRL',
      price: price.toFixed(2),
      availability,
      seller: product.user
        ? {
            '@type': 'Person',
            name: product.user.name,
          }
        : undefined,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
