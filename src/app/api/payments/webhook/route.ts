import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PagBank envia webhooks (notifications) para este endpoint
export async function POST(request: Request) {
  const body = await request.json()
  
  console.log('PagBank Webhook received:', JSON.stringify(body, null, 2))

  const supabase = createClient()

  // PagBank envia notificações com estrutura:
  // { id, reference_id, charges: [{ id, status, ... }] }
  const { id: orderId, reference_id, charges } = body

  if (!reference_id && !orderId) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  const chargeStatus = charges?.[0]?.status
  
  // Mapear status PagBank → status interno
  const statusMap: Record<string, string> = {
    'AUTHORIZED': 'paid',
    'PAID': 'paid',
    'AVAILABLE': 'paid',
    'IN_ANALYSIS': 'pending',
    'DECLINED': 'cancelled',
    'CANCELED': 'cancelled',
    'WAITING': 'pending'
  }

  const internalStatus = statusMap[chargeStatus] || 'pending'

  // Atualizar pedido pelo reference_id ou payment_id
  const query = reference_id 
    ? supabase.from('orders').update({ 
        status: internalStatus,
        payment_status: chargeStatus,
        paid_at: internalStatus === 'paid' ? new Date().toISOString() : null
      }).eq('reference_id', reference_id)
    : supabase.from('orders').update({ 
        status: internalStatus,
        payment_status: chargeStatus,
        paid_at: internalStatus === 'paid' ? new Date().toISOString() : null
      }).eq('payment_id', orderId)

  const { error } = await query

  if (error) {
    console.error('Webhook DB Error:', error)
  }

  // Se pagamento confirmado, ativar escrow
  if (internalStatus === 'paid') {
    // Buscar pedido para obter dados
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, total, product_id')
      .or(`reference_id.eq.${reference_id},payment_id.eq.${orderId}`)
      .single()

    if (order) {
      // Criar/atualizar registro de escrow na tabela correta
      await supabase.from('escrow_transactions').upsert({
        order_id: order.id,
        amount: order.total,
        status: 'payment_held',
        held_at: new Date().toISOString(),
      }, { onConflict: 'order_id' })

      // Atualizar produto como vendido
      await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', order.product_id)
    }
  }

  return NextResponse.json({ received: true })
}

// PagBank pode enviar GET para verificar se o endpoint existe
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'pagbank' })
}
