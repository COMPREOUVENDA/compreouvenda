import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyReviewReceived } from '@/lib/server-notifications';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── POST /api/reviews — criar avaliação ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, reviewer_id, reviewed_id, product_id, rating, comment } = body;

    if (!order_id || !reviewer_id || !reviewed_id || !rating) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Nota deve ser entre 1 e 5.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verificar se o pedido existe e pertence ao revisor
    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, status')
      .eq('id', order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Verificar se review já existe para este pedido
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order_id)
      .eq('reviewer_id', reviewer_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Você já avaliou este pedido.' }, { status: 409 });
    }

    // Criar a avaliação
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        order_id,
        reviewer_id,
        reviewed_id,
        product_id: product_id || null,
        rating,
        comment: comment?.trim() || null,
      })
      .select('id')
      .single();

    if (reviewError) {
      console.error('[POST /api/reviews] error:', reviewError.message);
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    // Atualizar média de avaliação do vendedor em background
    const updateRating = async () => {
      const { data: ratingData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', reviewed_id);

      if (ratingData && ratingData.length > 0) {
        const avg = ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length;
        await supabase
          .from('users')
          .update({
            avg_rating: Math.round(avg * 10) / 10,
            total_reviews: ratingData.length,
          })
          .eq('id', reviewed_id);
      }
    };

    // Buscar dados para notificação
    const notifyReviewed = async () => {
      const [{ data: reviewer }, { data: product }] = await Promise.all([
        supabase.from('users').select('name').eq('id', reviewer_id).single(),
        product_id
          ? supabase.from('products').select('title').eq('id', product_id).single()
          : Promise.resolve({ data: null }),
      ]);

      await notifyReviewReceived(reviewed_id, {
        reviewerName: (reviewer as any)?.name || 'Um comprador',
        rating,
        productTitle: (product as any)?.title || 'um produto',
      });
    };

    // Executar em background
    Promise.all([updateRating(), notifyReviewed()]).catch((e) =>
      console.error('[POST /api/reviews] background error:', e)
    );

    return NextResponse.json({ reviewId: review.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}

// ─── GET /api/reviews — listar avaliações de um usuário ─────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'received'; // 'received' | 'given'
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const field = type === 'received' ? 'reviewed_id' : 'reviewer_id';

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        reviewer:users!reviews_reviewer_id_fkey(id, name, avatar_url),
        reviewed:users!reviews_reviewed_id_fkey(id, name, avatar_url),
        product:products(id, title, images:product_images(url))
      `)
      .eq(field, userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ reviews: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
