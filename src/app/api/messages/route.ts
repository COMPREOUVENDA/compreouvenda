import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyNewMessage } from '@/lib/server-notifications';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── POST /api/messages — enviar mensagem + notificar destinatário ────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation_id, sender_id, content, type = 'text', offer_amount, metadata } = body;

    if (!conversation_id || !sender_id || (!content && type === 'text')) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Inserir mensagem
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id,
        content: content || '',
        type,
        offer_amount: offer_amount || null,
        metadata: metadata || null,
      })
      .select('id, created_at')
      .single();

    if (msgError) {
      console.error('[POST /api/messages] error:', msgError.message);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Atualizar last_message na conversa
    const updateConv = supabase
      .from('conversations')
      .update({
        last_message: type === 'image' ? '📷 Imagem' : type === 'offer' ? '💰 Proposta' : content.slice(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation_id);

    // Notificar destinatário em background
    const notifyRecipient = async () => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversation_id)
        .single();

      if (!conv) return;

      const recipientId = (conv as any).buyer_id === sender_id
        ? (conv as any).seller_id
        : (conv as any).buyer_id;

      const { data: sender } = await supabase
        .from('users')
        .select('name')
        .eq('id', sender_id)
        .single();

      const preview = type === 'image'
        ? '📷 Imagem'
        : type === 'offer'
        ? `💰 Proposta: R$ ${Number(offer_amount || 0).toFixed(2).replace('.', ',')}`
        : (content || '').slice(0, 80);

      await notifyNewMessage(recipientId, {
        senderName: (sender as any)?.name || 'Alguém',
        preview,
        conversationId: conversation_id,
      });
    };

    // Executar em background sem bloquear resposta
    Promise.all([updateConv, notifyRecipient()]).catch((e) =>
      console.error('[POST /api/messages] background error:', e)
    );

    return NextResponse.json({ messageId: message.id, createdAt: message.created_at }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}

// ─── GET /api/messages — buscar mensagens de uma conversa ──────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // cursor para paginação

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId obrigatório.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    let query = supabase
      .from('messages')
      .select('id, sender_id, content, type, offer_amount, offer_status, metadata, read_at, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: (data || []).reverse() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
