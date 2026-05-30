import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refundCharge } from '@/lib/pagbank'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { orderId, reason, amount } = await request.json()

  if (!orderId) {
    return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 })
  }

  // Buscar pedido
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Verificar se o usuário é o comprador ou admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (order.buyer_id !== user.id && userProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Verificar se já foi pago
  if (order.status !== 'paid' && order.status !== 'shipped') {
    return NextResponse.json({ error: 'Pedido não pode ser estornado neste status' }, { status: 400 })
  }

  try {
    // Pegar charge_id do metadata
    const chargeId = order.metadata?.charges?.[0]?.id
    if (!chargeId) {
      return NextResponse.json({ error: 'Charge não encontrado' }, { status: 400 })
    }

    // Fazer refund no PagBank (parcial ou total)
    const refundAmount = amount ? Math.round(amount * 100) : undefined
    const result = await refundCharge(chargeId, refundAmount)

    // Atualizar pedido
    await supabase.from('orders').update({
      status: 'refunded',
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
      refund_amount: amount || order.total
    }).eq('id', orderId)

    // Atualizar escrow
    await supabase.from('escrow').update({
      status: 'refunded',
      released_at: new Date().toISOString()
    }).eq('order_id', orderId)

    // Reativar produto
    if (order.product_id) {
      await supabase.from('products').update({ status: 'active' }).eq('id', order.product_id)
    }

    return NextResponse.json({ success: true, refund: result })

  } catch (error: any) {
    console.error('Refund Error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao estornar' }, { status: 500 })
  }
}
