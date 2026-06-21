import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES } from '@/lib/constants';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://compreouvenda.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Páginas estáticas principais
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                            lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/search`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/solidario`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/product/new`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/onboarding`,            lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/dashboard`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/chat`,                  lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE_URL}/orders`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/favorites`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/wallet`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/notifications`,         lastModified: now, changeFrequency: 'daily',   priority: 0.5 },
    { url: `${BASE_URL}/settings`,              lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/help`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`,                 lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/privacy`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/prohibited-products`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];

  // Páginas de categoria (uma por categoria + buscas comuns por cidade)
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/search?category=${cat.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Páginas de busca por cidades populares
  const popularCities = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador',
    'Fortaleza', 'Curitiba', 'Manaus', 'Recife', 'Porto Alegre', 'Belém',
  ];
  const cityPages: MetadataRoute.Sitemap = popularCities.map((city) => ({
    url: `${BASE_URL}/search?city=${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Produtos e perfis de vendedores do banco (server-side)
  let productPages: MetadataRoute.Sitemap = [];
  let sellerPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Produtos ativos — prioridade por destaque e recentes
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at, is_featured, views_count')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (products) {
      productPages = products.map((p) => ({
        url: `${BASE_URL}/product/${p.id}`,
        lastModified: p.updated_at || now,
        changeFrequency: 'weekly' as const,
        // Produtos em destaque ou com muitas views têm prioridade maior
        priority: p.is_featured ? 0.9 : (p.views_count || 0) > 50 ? 0.8 : 0.7,
      }));
    }

    // Perfis de vendedores com produtos ativos
    const { data: sellers } = await supabase
      .from('users')
      .select('id, updated_at')
      .eq('type', 'seller')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (sellers) {
      sellerPages = sellers.map((s) => ({
        url: `${BASE_URL}/seller/${s.id}`,
        lastModified: s.updated_at || now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Silencia erro para não quebrar o build se Supabase estiver indisponível
  }

  return [
    ...staticPages,
    ...categoryPages,
    ...cityPages,
    ...productPages,
    ...sellerPages,
  ];
}
