import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixOrder, createCreditCardOrder, type CreateOrderParams } from '@/lib/pagbank'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { 
    productId, 
    amount, 
    paymentMethod, 
    cardData, 
    sellerId,
    sellerPagBankId,
    enableCharity,
    charityPagBankId,
    description 
  } = body

  if (!productId || !amount || !paymentMethod) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Buscar dados do comprador
  const { data: buyer } = await supabase
    .from('users')
    .select('name, email, document, phone')
    .eq('auth_id', user.id)
    .single()

  if (!buyer) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 400 })
  }

  const referenceId = `order_${Date.now()}_${productId.substring(0, 8)}`

  const orderParams: CreateOrderParams = {
    referenceId,
    description: description || 'Compra CompreOuVenda',
    amount: Math.round(amount * 100), // converter para centavos
    customer: {
      name: buyer.name,
      email: buyer.email,
      taxId: buyer.document || '',
      phone: buyer.phone?.replace(/\D/g, '')
    },
    paymentMethod: paymentMethod === 'PIX' ? 'PIX' : 'CREDIT_CARD',
    cardData: paymentMethod === 'CREDIT_CARD' ? cardData : undefined,
    split: sellerPagBankId ? {
      sellerId: sellerPagBankId,
      charityId: charityPagBankId,
      enableCharity: enableCharity || false
    } : undefined
  }

  try {
    let order

    if (paymentMethod === 'PIX') {
      order = await createPixOrder(orderParams)
    } else {
      order = await createCreditCardOrder(orderParams)
    }

    // Salvar pedido no banco
    const { data: savedOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        product_id: productId,
        total: amount,
        status: 'pending',
        payment_method: paymentMethod,
        payment_id: order.id,
        reference_id: referenceId,
        metadata: {
          pagbank_order_id: order.id,
          charges: order.charges,
          qr_codes: order.qr_codes
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB Error:', dbError)
    }

    // Extrair QR code para PIX
    let pixData = null
    if (paymentMethod === 'PIX' && order.qr_codes?.length) {
      const qr = order.qr_codes[0]
      pixData = {
        qrCodeText: qr.text, // copia e cola
        qrCodeImage: qr.links?.find((l: any) => l.media === 'image/png')?.href,
        expiresAt: qr.expiration_date
      }
    }

    return NextResponse.json({
      success: true,
      orderId: savedOrder?.id || order.id,
      pagbankOrderId: order.id,
      status: order.charges?.[0]?.status || 'WAITING',
      pixData,
      chargeId: order.charges?.[0]?.id
    })

  } catch (error: any) {
    console.error('Payment Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro ao processar pagamento' 
    }, { status: 500 })
  }
}
