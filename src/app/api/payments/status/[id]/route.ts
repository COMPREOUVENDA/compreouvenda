import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrderStatus } from '@/lib/pagbank'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const orderId = params.id

  // Buscar no banco local primeiro
  const { data: localOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!localOrder) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Se tem payment_id do PagBank, consultar status atualizado
  let pagbankStatus = null
  if (localOrder.payment_id) {
    try {
      pagbankStatus = await getOrderStatus(localOrder.payment_id)
      
      // Atualizar status local se mudou
      const chargeStatus = pagbankStatus.charges?.[0]?.status
      if (chargeStatus && chargeStatus !== localOrder.payment_status) {
        const statusMap: Record<string, string> = {
          'AUTHORIZED': 'paid', 'PAID': 'paid', 'AVAILABLE': 'paid',
          'IN_ANALYSIS': 'pending', 'DECLINED': 'cancelled', 'CANCELED': 'cancelled'
        }
        const newStatus = statusMap[chargeStatus] || localOrder.status
        
        await supabase.from('orders').update({
          status: newStatus,
          payment_status: chargeStatus
        }).eq('id', orderId)

        localOrder.status = newStatus
        localOrder.payment_status = chargeStatus
      }
    } catch (e) {
      // API indisponível, usar dados locais
    }
  }

  return NextResponse.json({
    id: localOrder.id,
    status: localOrder.status,
    paymentStatus: localOrder.payment_status || 'WAITING',
    total: localOrder.total,
    paymentMethod: localOrder.payment_method,
    createdAt: localOrder.created_at,
    paidAt: localOrder.paid_at,
    pixData: localOrder.metadata?.qr_codes?.[0] ? {
      qrCodeText: localOrder.metadata.qr_codes[0].text,
      qrCodeImage: localOrder.metadata.qr_codes[0].links?.find((l: any) => l.media === 'image/png')?.href,
      expiresAt: localOrder.metadata.qr_codes[0].expiration_date
    } : null
  })
}
