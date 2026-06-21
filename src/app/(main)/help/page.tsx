'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, HelpCircle, MessageCircle, Mail, Shield,
  CreditCard, Package, Sparkles, Phone, ExternalLink,
} from 'lucide-react';

const faqs = [
  {
    category: 'Comprando',
    icon: Package,
    color: 'text-brand-blue',
    bg: 'bg-brand-blue/10',
    questions: [
      { q: 'Como faço para comprar um produto?', a: 'Navegue pelos produtos, clique naquele que deseja e clique em "Comprar". Você pode pagar via PIX (instantâneo) ou cartão de crédito.' },
      { q: 'O pagamento é seguro?', a: 'Sim! Usamos escrow (garantia). Seu dinheiro fica retido até você confirmar o recebimento do produto.' },
      { q: 'Posso cancelar uma compra?', a: 'Sim, enquanto o vendedor não enviar o produto. Após o envio, abra uma disputa se houver problemas.' },
      { q: 'Como funciona o frete?', a: 'O frete é combinado entre comprador e vendedor via chat. Recomendamos serviços com rastreamento.' },
    ],
  },
  {
    category: 'Vendendo',
    icon: CreditCard,
    color: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    questions: [
      { q: 'Como anunciar um produto?', a: 'Clique no "+" no menu inferior, preencha título, descrição, preço e adicione fotos. A IA pode ajudar a gerar o texto automaticamente!' },
      { q: 'Qual a comissão da plataforma?', a: 'Cobramos 10% sobre o valor da venda. O restante vai direto para sua carteira disponível para saque via PIX.' },
      { q: 'Como recebo meu dinheiro?', a: 'Após o comprador confirmar o recebimento, o valor é liberado na sua carteira. Saque via PIX a qualquer momento.' },
      { q: 'Posso usar IA para precificar?', a: 'Sim! Nosso sistema de IA analisa produtos similares e sugere preços competitivos automaticamente no formulário de anúncio.' },
    ],
  },
  {
    category: 'Segurança',
    icon: Shield,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    questions: [
      { q: 'Como ativar a verificação em dois fatores?', a: 'Vá em Configurações > Segurança e clique em "Configurar 2FA". Você precisará de um app autenticador como Google Authenticator.' },
      { q: 'Esqueci minha senha, o que fazer?', a: 'Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas por email.' },
      { q: 'Como denunciar um produto ou usuário?', a: 'Clique em "Denunciar" presente em cada anúncio ou perfil. Nossa equipe analisa em até 24 horas.' },
    ],
  },
  {
    category: 'IA & Tecnologia',
    icon: Sparkles,
    color: 'text-brand-orange',
    bg: 'bg-orange-50',
    questions: [
      { q: 'O que a IA faz nos anúncios?', a: 'A IA gera títulos atrativos, descrições detalhadas, sugere categorias e preços, e detecta produtos similares no mercado.' },
      { q: 'Como funciona o vídeo gerado por IA?', a: 'Envie 8 fotos do produto e nossa IA monta automaticamente um vídeo animado para tornar seu anúncio mais atrativo.' },
      { q: 'Os dados enviados são privados?', a: 'Sim. As fotos são usadas apenas para gerar o anúncio e armazenadas com criptografia. Nunca compartilhamos com terceiros.' },
    ],
  },
  {
    category: 'Módulo Solidário',
    icon: HelpCircle,
    color: 'text-brand-pink',
    bg: 'bg-brand-pink/10',
    questions: [
      { q: 'O que é o módulo solidário?', a: 'É um programa onde parte do valor de cada venda marcada como solidária é destinada a instituições beneficentes parceiras.' },
      { q: 'Quanto é doado por venda?', a: 'Você escolhe a porcentagem ao criar o anúncio. O mínimo é 2% do valor da venda.' },
      { q: 'Posso cadastrar minha instituição?', a: 'Sim! Entre em contato pelo email contato@compreouvenda.com com os dados da sua organização.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between py-3.5 text-left gap-3"
      >
        <span className="text-sm font-medium text-gray-800 leading-relaxed">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-3.5 animate-slide-up">
          {a}
        </p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-3xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-7 h-7 text-brand-purple" />
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Central de Ajuda</h1>
        <p className="text-gray-500 text-sm mt-1">Encontre respostas rápidas para suas dúvidas</p>
      </div>

      {/* FAQ sections */}
      {faqs.map((section, idx) => (
        <div key={idx} className="card p-0 overflow-hidden">
          <div className={`flex items-center gap-3 px-5 py-4 border-b border-gray-50`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${section.bg}`}>
              <section.icon className={`w-4 h-4 ${section.color}`} />
            </div>
            <h2 className="font-display font-semibold text-gray-900">{section.category}</h2>
          </div>
          <div className="px-5">
            {section.questions.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      ))}

      {/* Contact card */}
      <div className="bg-gradient-to-br from-brand-purple/10 via-brand-blue/5 to-brand-orange/10 rounded-3xl p-6 text-center border border-brand-purple/10">
        <MessageCircle className="w-8 h-8 text-brand-purple mx-auto mb-3" />
        <h3 className="font-display font-semibold text-gray-900 mb-1">Ainda precisa de ajuda?</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          Use nosso chat de suporte ou envie um email. Respondemos em até 24h úteis.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href="mailto:contato@compreouvenda.com"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Enviar email
          </a>
          <a
            href="https://wa.me/5500000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap justify-center gap-4 pt-2 pb-2">
        {[
          { href: '/legal/terms', label: 'Termos de Uso' },
          { href: '/legal/privacy', label: 'Política de Privacidade' },
          { href: '/legal/cookies', label: 'Cookies' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-purple transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
