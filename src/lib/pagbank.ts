/**
 * PagBank Payment Gateway Integration
 * API v4 - PIX + Cartão de Crédito + Split de Pagamento
 * 
 * Docs: https://dev.pagseguro.uol.com.br/reference/criar-pedido
 */

const PAGBANK_BASE_URL = process.env.PAGBANK_ENV === 'production'
  ? 'https://api.pagbank.com.br'
  : 'https://sandbox.api.pagbank.com.br'

const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN || ''

// Plataforma fica com 10%, vendedor 90%
const PLATFORM_FEE_PERCENT = 10
// Taxa solidária opcional: 2% do vendedor
const CHARITY_FEE_PERCENT = 2

interface CreateOrderParams {
  referenceId: string
  description: string
  amount: number // em centavos
  customer: {
    name: string
    email: string
    taxId: string // CPF ou CNPJ
    phone?: string
  }
  paymentMethod: 'PIX' | 'CREDIT_CARD'
  cardData?: {
    number: string
    expMonth: string
    expYear: string
    securityCode: string
    holderName: string
    installments?: number
  }
  split?: {
    sellerId: string // account_id do vendedor no PagBank
    charityId?: string // account_id da instituição
    enableCharity?: boolean
  }
}

interface PagBankOrder {
  id: string
  reference_id: string
  status: string
  charges: Array<{
    id: string
    status: string
    amount: { value: number; currency: string }
    payment_method: { type: string }
    payment_response?: { code: string; message: string }
    links?: Array<{ rel: string; href: string; media: string }>
  }>
  qr_codes?: Array<{
    id: string
    text: string
    links: Array<{ rel: string; href: string; media: string }>
    expiration_date: string
  }>
  links?: Array<{ rel: string; href: string }>
}

async function pagbankRequest(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`${PAGBANK_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAGBANK_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-version': '4.0'
    },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('PagBank API Error:', data)
    throw new Error(data.error_messages?.[0]?.description || 'Erro na API PagBank')
  }

  return data
}

export async function createPixOrder(params: CreateOrderParams): Promise<PagBankOrder> {
  const body: any = {
    reference_id: params.referenceId,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      tax_id: params.customer.taxId.replace(/\D/g, ''),
      phones: params.customer.phone ? [{
        country: '55',
        area: params.customer.phone.substring(0, 2),
        number: params.customer.phone.substring(2),
        type: 'MOBILE'
      }] : undefined
    },
    items: [{
      reference_id: params.referenceId,
      name: params.description.substring(0, 64),
      quantity: 1,
      unit_amount: params.amount
    }],
    qr_codes: [{
      amount: { value: params.amount },
      expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
    }],
    notification_urls: [
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://compreouvenda.vercel.app'}/api/payments/webhook`
    ]
  }

  // Split de pagamento
  if (params.split?.sellerId) {
    const platformAmount = Math.round(params.amount * PLATFORM_FEE_PERCENT / 100)
    const charityAmount = params.split.enableCharity 
      ? Math.round(params.amount * CHARITY_FEE_PERCENT / 100) 
      : 0
    const sellerAmount = params.amount - platformAmount - charityAmount

    body.qr_codes[0].splits = [{
      method: 'FIXED',
      receivers: [
        {
          account: { id: params.split.sellerId },
          amount: { value: sellerAmount }
        }
      ]
    }]

    // Se tem instituição solidária
    if (params.split.enableCharity && params.split.charityId) {
      body.qr_codes[0].splits[0].receivers.push({
        account: { id: params.split.charityId },
        amount: { value: charityAmount }
      })
    }
  }

  return await pagbankRequest('/orders', body)
}

export async function createCreditCardOrder(params: CreateOrderParams): Promise<PagBankOrder> {
  if (!params.cardData) throw new Error('Dados do cartão obrigatórios')

  const body: any = {
    reference_id: params.referenceId,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      tax_id: params.customer.taxId.replace(/\D/g, ''),
      phones: params.customer.phone ? [{
        country: '55',
        area: params.customer.phone.substring(0, 2),
        number: params.customer.phone.substring(2),
        type: 'MOBILE'
      }] : undefined
    },
    items: [{
      reference_id: params.referenceId,
      name: params.description.substring(0, 64),
      quantity: 1,
      unit_amount: params.amount
    }],
    charges: [{
      reference_id: `charge_${params.referenceId}`,
      description: params.description.substring(0, 64),
      amount: { value: params.amount, currency: 'BRL' },
      payment_method: {
        type: 'CREDIT_CARD',
        installments: params.cardData.installments || 1,
        card: {
          number: params.cardData.number.replace(/\D/g, ''),
          exp_month: params.cardData.expMonth,
          exp_year: params.cardData.expYear,
          security_code: params.cardData.securityCode,
          holder: {
            name: params.cardData.holderName,
            tax_id: params.customer.taxId.replace(/\D/g, '')
          }
        },
        capture: true
      }
    }],
    notification_urls: [
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://compreouvenda.vercel.app'}/api/payments/webhook`
    ]
  }

  // Split de pagamento para cartão
  if (params.split?.sellerId) {
    const platformAmount = Math.round(params.amount * PLATFORM_FEE_PERCENT / 100)
    const charityAmount = params.split.enableCharity 
      ? Math.round(params.amount * CHARITY_FEE_PERCENT / 100) 
      : 0
    const sellerAmount = params.amount - platformAmount - charityAmount

    body.charges[0].splits = [{
      method: 'FIXED',
      receivers: [
        {
          account: { id: params.split.sellerId },
          amount: { value: sellerAmount }
        }
      ]
    }]

    if (params.split.enableCharity && params.split.charityId) {
      body.charges[0].splits[0].receivers.push({
        account: { id: params.split.charityId },
        amount: { value: charityAmount }
      })
    }
  }

  return await pagbankRequest('/orders', body)
}

export async function getOrderStatus(orderId: string): Promise<any> {
  const response = await fetch(`${PAGBANK_BASE_URL}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${PAGBANK_TOKEN}`,
      'Accept': 'application/json',
      'x-api-version': '4.0'
    }
  })
  return await response.json()
}

export async function refundCharge(chargeId: string, amount?: number): Promise<any> {
  const body: any = {}
  if (amount) body.amount = { value: amount }

  const response = await fetch(`${PAGBANK_BASE_URL}/charges/${chargeId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAGBANK_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-version': '4.0'
    },
    body: JSON.stringify(body)
  })
  return await response.json()
}

export { PLATFORM_FEE_PERCENT, CHARITY_FEE_PERCENT }
export type { CreateOrderParams, PagBankOrder }
