import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      price,
      category_id,
      condition,
      images,
      videos,
      location,
      latitude,
      longitude,
    } = body;

    if (!title || !price || !category_id || !condition) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        user_id: profile.id,
        title,
        description,
        price,
        category_id,
        condition,
        status: 'active',
        location: location || '',
        latitude: latitude || null,
        longitude: longitude || null,
      })
      .select()
      .single();

    if (error || !product) {
      return NextResponse.json({ error: error?.message || 'Erro ao criar produto.' }, { status: 500 });
    }

    // Inserir imagens se houver
    if (images?.length) {
      await supabase.from('product_images').insert(
        images.map((url: string, index: number) => ({
          product_id: product.id,
          url,
          position: index,
        }))
      );
    }

    // Inserir vídeos se houver
    if (videos?.length) {
      await supabase.from('product_videos').insert(
        videos.map((url: string, index: number) => ({
          product_id: product.id,
          url,
          position: index,
        }))
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
