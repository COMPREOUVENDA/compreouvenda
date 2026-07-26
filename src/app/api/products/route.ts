import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/^\uFEFF/, '').trim();
}

function getUserClient(token: string) {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const supabase = getUserClient(token);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
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

    const { data: profileRows } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userData.user.id);

    let profile = profileRows?.[0];

    if (!profile) {
      const name =
        userData.user.user_metadata?.name ||
        userData.user.email?.split('@')[0] ||
        'Usuário';
      const type = userData.user.user_metadata?.type || 'buyer';
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert({ auth_id: userData.user.id, email: userData.user.email, name, type })
        .select('id');
      if (insertErr) {
        console.error('[products] auto-create profile error:', insertErr);
        return NextResponse.json(
          { error: 'Perfil não encontrado.', detail: insertErr.message, code: insertErr.code },
          { status: 404 }
        );
      }
      profile = inserted?.[0];
    }

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
        city: location || '',
        state: '',
        location_lat: latitude || null,
        location_lng: longitude || null,
      })
      .select()
      .single();

    if (error || !product) {
      return NextResponse.json({ error: error?.message || 'Erro ao criar produto.' }, { status: 500 });
    }

    if (images?.length) {
      await supabase.from('product_images').insert(
        images.map((url: string, index: number) => ({
          product_id: product.id,
          url,
          position: index,
        }))
      );
    }

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
