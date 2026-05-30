'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, MessageCircle, Mail, Shield, CreditCard, Package, Truck } from 'lucide-react'

const faqs = [
  {
    category: 'Comprando',
    icon: Package,
    questions: [
      { q: 'Como faço para comprar um produto?', a: 'Navegue pelos produtos, clique naquele que deseja, e clique em "Comprar". Você pode pagar via PIX (instantâneo) ou cartão de crédito.' },
      { q: 'O pagamento é seguro?', a: 'Sim! Usamos o sistema de escrow (garantia). Seu dinheiro fica retido até você confirmar o recebimento do produto.' },
      { q: 'Posso cancelar uma compra?', a: 'Sim, enquanto o vendedor não enviar o produto. Após o envio, você pode abrir uma disputa se houver problemas.' },
      { q: 'Como funciona o frete?', a: 'O frete é combinado entre comprador e vendedor via chat. Recomendamos usar serviços com rastreamento.' }
    ]
  },
  {
    category: 'Vendendo',
    icon: CreditCard,
    questions: [
      { q: 'Como anunciar um produto?', a: 'Clique no botão "Anunciar", preencha título, descrição, preço e adicione fotos. Quanto mais detalhado, melhor!' },
      { q: 'Qual a comissão da plataforma?', a: 'Cobramos 10% sobre o valor da venda. O restante vai direto para sua carteira.' },
      { q: 'Como recebo meu dinheiro?', a: 'Após o comprador confirmar o recebimento, o valor é liberado na sua carteira. Você pode sacar via PIX a qualquer momento.' },
      { q: 'Posso usar IA para precificar?', a: 'Sim! Nosso sistema de IA analisa o mercado e sugere preços competitivos para seus produtos.' }
    ]
  },
  {
    category: 'Segurança',
    icon: Shield,
    questions: [
      { q: 'Como ativar a verificação em dois fatores?', a: 'Vá em Configurações > Segurança e clique em "Configurar 2FA". Você precisará de um app autenticador como Google Authenticator.' },
      { q: 'Esqueci minha senha, o que fazer?', a: 'Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas por email.' },
      { q: 'Como denunciar um produto ou usuário?', a: 'Clique no botão "Denunciar" presente em cada anúncio ou perfil. Nossa equipe analisa em até 24 horas.' }
    ]
  },
  {
    category: 'Módulo Solidário',
    icon: HelpCircle,
    questions: [
      { q: 'O que é o módulo solidário?', a: 'É um programa onde parte do valor de cada venda marcada é destinada a instituições beneficentes parceiras.' },
      { q: 'Quanto é doado?', a: '2% do valor da venda é destinado à instituição escolhida pelo vendedor.' },
      { q: 'Posso cadastrar minha instituição?', a: 'Sim! Entre em contato pelo email contato@compreouvenda.com com os dados da sua instituição.' }
    ]
  }
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-gray-600 pb-3">{a}</p>}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <HelpCircle className="mx-auto text-purple-600 mb-2" size={40} />
        <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        <p className="text-gray-500 mt-1">Encontre respostas para suas dúvidas</p>
      </div>

      {faqs.map((section, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">
            <section.icon size={20} className="text-purple-500" />
            {section.category}
          </h2>
          <div className="divide-y">
            {section.questions.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      ))}

      <div className="bg-purple-50 rounded-xl p-5 text-center">
        <MessageCircle className="mx-auto text-purple-600 mb-2" size={32} />
        <h3 className="font-semibold">Ainda precisa de ajuda?</h3>
        <p className="text-sm text-gray-600 mt-1">
          Use nosso chatbot no canto inferior ou envie um email
        </p>
        <a href="mailto:contato@compreouvenda.com" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-600 text-white rounded-full text-sm hover:bg-purple-700">
          <Mail size={16} /> contato@compreouvenda.com
        </a>
      </div>
    </div>
  )
}
