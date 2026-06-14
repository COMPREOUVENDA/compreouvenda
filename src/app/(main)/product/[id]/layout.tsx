import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: product } = await supabase
    .from('products')
    .select('id, title, description, price, condition, images:product_images(url)')
    .eq('id', params.id)
    .single();

  if (!product) {
    return {
      title: 'Produto | compreOUvenda',
      description: 'Compre e venda produtos com segurança no compreOUvenda.',
    };
  }

  const imageUrl = (product.images as any[])?.[0]?.url || '/og-default.png';
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price);

  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.title} por ${priceFormatted} no compreOUvenda. Compra segura com proteção ao comprador.`;

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://compreouvenda.vercel.app'}/product/${params.id}`;

  return {
    title: `${product.title} — ${priceFormatted} | compreOUvenda`,
    description,
    openGraph: {
      title: product.title,
      description,
      url,
      type: 'website',
      images: [{ url: imageUrl, width: 800, height: 600, alt: product.title }],
      siteName: 'compreOUvenda',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
