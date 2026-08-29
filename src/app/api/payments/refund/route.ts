import { NextRequest, NextResponse } from 'next/server'
import { refundCharge } from '@/lib/pagbank'
import { getAuthUserId, getServiceClient, getAdminIdentity } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const authUserId = await getAuthUserId(request)

  if (!authUserId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { orderId, reason, amount } = await request.json()

  if (!orderId) {
    return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Autorização: o próprio comprador ou um admin financeiro.
  // `orders.buyer_id` referencia `users.id` (id público), não o uid do Auth —
  // comparar diretamente com o uid nunca casava e travava o comprador legítimo.
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUserId)
    .single()

  const isBuyer = !!profile && order.buyer_id === profile.id

  if (!isBuyer) {
    const admin = await getAdminIdentity(request)
    const canRefund = admin && (admin.role === 'super_admin' || admin.role === 'admin_financial')
    if (!canRefund) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  // O schema real usa `payment_status`; a coluna `status` não existe em orders.
  if (order.payment_status !== 'paid' && order.payment_status !== 'held') {
    return NextResponse.json(
      { error: `Pedido não pode ser estornado no status "${order.payment_status}"` },
      { status: 400 }
    )
  }

  try {
    const chargeId = order.metadata?.charges?.[0]?.id
    if (!chargeId) {
      return NextResponse.json({ error: 'Charge não encontrado' }, { status: 400 })
    }

    const refundAmount = amount ? Math.round(amount * 100) : undefined
    const result = await refundCharge(chargeId, refundAmount)

    const { error: orderError } = await supabase.from('orders').update({
      payment_status: 'refunded',
      escrow_status: 'cancelled',
      refund_reason: reason ?? null,
      refunded_at: new Date().toISOString(),
      refund_amount: amount ?? order.gross_value,
    }).eq('id', orderId)

    if (orderError) {
      return NextResponse.json({ error: 'Estorno feito no gateway, mas falhou ao registrar: ' + orderError.message }, { status: 500 })
    }

    await supabase.from('escrow_transactions').update({
      status: 'cancelled',
      released_at: new Date().toISOString(),
    }).eq('order_id', orderId)

    if (order.product_id) {
      await supabase.from('products').update({ status: 'active' }).eq('id', order.product_id)
    }

    return NextResponse.json({ success: true, refund: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao estornar'
    console.error('Refund Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
