import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Você é o assistente virtual do CompreOuVenda, um marketplace brasileiro.
Ajude os usuários com dúvidas sobre:
- Como comprar e vender produtos
- Pagamentos (PIX, cartão) e escrow
- Frete e entrega
- Segurança da conta (2FA)
- Módulo solidário (doações)
- Problemas com pedidos
- Como criar anúncios atrativos
- Política de produtos proibidos

Seja conciso, amigável e responda em português brasileiro.
Se não souber algo, sugira contatar o suporte: contato@compreouvenda.com`

export async function POST(request: Request) {
  const { message, history } = await request.json()

  if (!message) {
    return NextResponse.json({ reply: 'Por favor, digite sua pergunta.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.includes('placeholder')) {
    // Fallback sem IA
    return NextResponse.json({ reply: getFallbackReply(message) })
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    })

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar.'

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ reply: getFallbackReply(message) })
  }
}

function getFallbackReply(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('pagar') || lower.includes('pagamento') || lower.includes('pix')) {
    return 'Aceitamos PIX e cartão de crédito! O pagamento fica em escrow até você confirmar o recebimento do produto. 💳'
  }
  if (lower.includes('vender') || lower.includes('anunciar') || lower.includes('anúncio')) {
    return 'Para vender, clique no botão "Anunciar" e preencha as informações do produto. Adicione boas fotos e uma descrição detalhada! 📸'
  }
  if (lower.includes('frete') || lower.includes('entrega') || lower.includes('envio')) {
    return 'O frete é combinado entre comprador e vendedor no chat. Recomendamos usar transportadoras com rastreamento. 📦'
  }
  if (lower.includes('segur') || lower.includes('2fa') || lower.includes('senha')) {
    return 'Recomendamos ativar a autenticação em dois fatores (2FA) em Configurações > Segurança para proteger sua conta. 🔐'
  }
  if (lower.includes('solidário') || lower.includes('doação') || lower.includes('caridade')) {
    return 'No módulo solidário, 2% de cada venda marcada é destinada a uma instituição beneficente. Venda com propósito! 💜'
  }
  return 'Para mais informações, acesse nosso menu ou entre em contato pelo e-mail contato@compreouvenda.com. Estou aqui para ajudar! 😊'
}
