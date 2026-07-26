import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/env';

function getUserClient(token: string) {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function getAnonClient() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 50);

    const supabase = getAnonClient();
    let q = supabase
      .from('products')
      .select(
        'id, title, price, condition, city, state, views_count, favorites_count, is_featured, featured_until, thumbnail_url, category_id, user_id, created_at, user:users!products_user_id_fkey(id, name, avatar_url), category:categories!products_category_id_fkey(id, name, icon, slug)'
      )
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (categoryId) q = q.eq('category_id', categoryId);
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ products: data || [], hasMore: (data || []).length === pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
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
