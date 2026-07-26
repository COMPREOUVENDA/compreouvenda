import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const supabase = getServerClient();
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
      // Fallback: cria perfil via REST do Supabase autenticado do usuário,
      // pois a service role key no ambiente pode não estar bypassando RLS.
      const name =
        userData.user.user_metadata?.name ||
        userData.user.email?.split('@')[0] ||
        'Usuário';
      const type = userData.user.user_metadata?.type || 'buyer';
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          auth_id: userData.user.id,
          email: userData.user.email,
          name,
          type,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[products] auto-create profile error:', res.status, errText);
        return NextResponse.json(
          { error: 'Perfil não encontrado.', detail: errText, status: res.status },
          { status: 404 }
        );
      }
      const inserted = await res.json();
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
