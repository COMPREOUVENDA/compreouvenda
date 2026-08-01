import { NextRequest, NextResponse } from 'next/server'
import { createPixOrder, createCreditCardOrder, type CreateOrderParams } from '@/lib/pagbank'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import { getAuthUserId, getServiceClient, isValidTaxId } from '@/lib/api-auth'

/** Normaliza o método vindo do cliente ('pix' | 'PIX' | 'credit' | 'CREDIT_CARD'). */
function normalizeMethod(raw: unknown): 'PIX' | 'CREDIT_CARD' {
  const v = String(raw ?? '').toUpperCase()
  return v === 'PIX' ? 'PIX' : 'CREDIT_CARD'
}

/** Aceita cvv ou securityCode, holder ou holderName, e expiry "MM/AA". */
function normalizeCard(raw: any) {
  if (!raw) return undefined
  let expMonth = raw.expMonth
  let expYear = raw.expYear
  if ((!expMonth || !expYear) && typeof raw.expiry === 'string') {
    const [m, y] = raw.expiry.split('/').map((s: string) => s.trim())
    expMonth = m
    expYear = y && y.length === 2 ? `20${y}` : y
  }
  return {
    number: String(raw.number ?? '').replace(/\D/g, ''),
    expMonth: String(expMonth ?? ''),
    expYear: String(expYear ?? ''),
    securityCode: String(raw.securityCode ?? raw.cvv ?? ''),
    holderName: String(raw.holderName ?? raw.holder ?? ''),
    installments: Number(raw.installments ?? 1),
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 tentativas de pagamento por minuto por IP
  const ip = getClientIp(request)
  const rl = rateLimit(`payments-create:${ip}`, { limit: 10, windowSec: 60 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas tentativas de pagamento. Aguarde antes de tentar novamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  // Autenticação: cookie de sessão ou Authorization: Bearer <token>
  const authUserId = await getAuthUserId(request)

  if (!authUserId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const {
    productId,
    paymentMethod: rawMethod,
    cardData: rawCard,
    sellerPagBankId,
    enableCharity,
    charityPagBankId,
    description,
  } = body

  if (!productId || !rawMethod) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const paymentMethod = normalizeMethod(rawMethod)

  // Cliente com service role para leitura/escrita confiável
  const admin = getServiceClient()

  // Perfil do comprador (id público, não o auth uid)
  const { data: buyer } = await admin
    .from('users')
    .select('id, name, email, document, phone')
    .eq('auth_id', authUserId)
    .single()

  if (!buyer) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 400 })
  }

  // O PagBank exige CPF/CNPJ válido do pagador
  const taxId = String(buyer.document ?? '').replace(/\D/g, '')
  if (!isValidTaxId(taxId)) {
    return NextResponse.json(
      {
        error: 'Informe um CPF válido no seu perfil para finalizar a compra.',
        code: 'MISSING_TAX_ID',
        field: 'document',
      },
      { status: 400 }
    )
  }

  // Preço vem do banco — nunca do cliente
  const { data: product } = await admin
    .from('products')
    .select('id, user_id, title, price, status, donation_enabled, donation_type, donation_value, reseller_commission_value')
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }
  if (product.status && product.status !== 'active') {
    return NextResponse.json({ error: 'Produto indisponível' }, { status: 409 })
  }
  if (product.user_id === buyer.id) {
    return NextResponse.json({ error: 'Você não pode comprar seu próprio produto' }, { status: 400 })
  }

  const gross = Number(product.price)
  const sellerId = product.user_id

  // Split calculado no servidor
  const platformFee = +(gross * (PLATFORM_FEE_PERCENT / 100)).toFixed(2)
  const gatewayFee = +(gross * (paymentMethod === 'PIX' ? 0.015 : 0.035)).toFixed(2)
  const donationValue = product.donation_enabled && product.donation_value
    ? (product.donation_type === 'percentage'
        ? +(gross * (Number(product.donation_value) / 100)).toFixed(2)
        : Number(product.donation_value))
    : 0
  const sellerNet = +(gross - platformFee - gatewayFee - donationValue).toFixed(2)

  const referenceId = `order_${Date.now()}_${String(productId).substring(0, 8)}`

  const orderParams: CreateOrderParams = {
    referenceId,
    description: description || `Compra: ${product.title}`.slice(0, 64),
    amount: Math.round(gross * 100), // centavos
    customer: {
      name: buyer.name,
      email: buyer.email,
      taxId,
      phone: buyer.phone?.replace(/\D/g, ''),
    },
    paymentMethod,
    cardData: paymentMethod === 'CREDIT_CARD' ? normalizeCard(rawCard) : undefined,
    split: sellerPagBankId
      ? {
          sellerId: sellerPagBankId,
          charityId: charityPagBankId,
          enableCharity: enableCharity || false,
        }
      : undefined,
  }

  if (paymentMethod === 'CREDIT_CARD') {
    const c = orderParams.cardData
    if (!c?.number || !c.expMonth || !c.expYear || !c.securityCode || !c.holderName) {
      return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 })
    }
  }

  try {
    const order = paymentMethod === 'PIX'
      ? await createPixOrder(orderParams)
      : await createCreditCardOrder(orderParams)

    const chargeStatus: string = order.charges?.[0]?.status || (paymentMethod === 'PIX' ? 'WAITING' : 'PENDING')
    const isPaid = chargeStatus === 'PAID'

    // Persistir pedido usando o schema real de public.orders
    const { data: savedOrder, error: dbError } = await admin
      .from('orders')
      .insert({
        product_id: productId,
        buyer_id: buyer.id,
        seller_id: sellerId,
        gross_value: gross,
        platform_fee: platformFee,
        gateway_fee: gatewayFee,
        donation_value: donationValue,
        seller_net_value: sellerNet,
        payment_status: isPaid ? 'paid' : 'pending',
        payment_provider: 'pagbank',
        payment_id: order.id,
        reference_id: referenceId,
        transaction_id: order.charges?.[0]?.id || null,
        escrow_status: isPaid ? 'held' : 'pending',
        delivery_type: body.deliveryType || 'local_pickup',
        delivery_status: 'pending',
        buyer_confirmed: false,
        seller_confirmed: false,
        paid_at: isPaid ? new Date().toISOString() : null,
        metadata: {
          payment_method: paymentMethod,
          pagbank_order_id: order.id,
          charge_id: order.charges?.[0]?.id ?? null,
          charge_status: chargeStatus,
          qr_codes: order.qr_codes ?? null,
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('[payments/create] DB Error:', dbError.message)
      return NextResponse.json(
        { error: 'Pagamento iniciado, mas falhou ao registrar o pedido. Contate o suporte.', pagbankOrderId: order.id },
        { status: 500 }
      )
    }

    // QR code do PIX — devolve nos dois formatos para compatibilidade
    let pixData: Record<string, unknown> | null = null
    if (paymentMethod === 'PIX' && order.qr_codes?.length) {
      const qr = order.qr_codes[0]
      const image = qr.links?.find((l: any) => l.media === 'image/png')?.href
      pixData = {
        qrCode: image,
        qrCodeImage: image,
        copyPaste: qr.text,
        qrCodeText: qr.text,
        expiresAt: qr.expiration_date,
      }
    }

    return NextResponse.json({
      success: true,
      orderId: savedOrder.id,
      pagbankOrderId: order.id,
      status: chargeStatus,
      referenceId,
      pixData,
      chargeId: order.charges?.[0]?.id,
      split: { gross, platformFee, gatewayFee, donationValue, sellerNet },
    })
  } catch (error: any) {
    console.error('[payments/create] Payment Error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
