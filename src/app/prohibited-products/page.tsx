'use client';

import { ShieldAlert, AlertTriangle, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const CATEGORIES = [
  { title: 'Armas e munições', items: ['Armas de fogo', 'Armas brancas', 'Munições', 'Acessórios para armas', 'Réplicas realistas'] },
  { title: 'Drogas e substâncias controladas', items: ['Drogas ilícitas', 'Medicamentos sem receita', 'Substâncias anabolizantes', 'Produtos para fabricação de drogas'] },
  { title: 'Produtos falsificados', items: ['Réplicas de marcas', 'Documentos falsos', 'Dinheiro falso', 'Produtos pirateados'] },
  { title: 'Produtos roubados ou de origem ilícita', items: ['Celulares sem nota fiscal', 'Veículos com restrição', 'Produtos sem procedência comprovada'] },
  { title: 'Conteúdo adulto e exploração', items: ['Pornografia', 'Material envolvendo menores', 'Serviços sexuais', 'Conteúdo de exploração'] },
  { title: 'Animais', items: ['Animais silvestres', 'Espécies ameaçadas', 'Animais sem documentação', 'Partes de animais protegidos'] },
  { title: 'Explosivos e materiais perigosos', items: ['Fogos de artifício ilegais', 'Explosivos', 'Produtos químicos perigosos', 'Material radioativo'] },
  { title: 'Dados pessoais e digitais', items: ['Contas roubadas', 'Dados pessoais de terceiros', 'Senhas e acessos não autorizados', 'Software malicioso'] },
  { title: 'Produtos de saúde não regulamentados', items: ['Medicamentos vencidos', 'Equipamentos médicos sem registro', 'Suplementos proibidos pela ANVISA'] },
  { title: 'Outros', items: ['Órgãos humanos', 'Itens que incentivem violência', 'Produtos que violem direitos autorais', 'Qualquer item ilegal pela legislação brasileira'] },
];

export default function ProhibitedProductsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Produtos Proibidos</h1>
            <p className="text-gray-400 text-sm">Política de itens não permitidos na plataforma</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Anúncios que violem esta política serão removidos imediatamente. Contas reincidentes serão banidas permanentemente.
          </p>
        </div>

        <div className="space-y-2">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Ban className="w-5 h-5 text-red-400" />
                  <span className="text-white font-medium text-sm">{cat.title}</span>
                </div>
                {openIndex === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 pl-12">
                  <ul className="space-y-1">
                    {cat.items.map((item, j) => (
                      <li key={j} className="text-gray-400 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-bold mb-3">Consequências</h2>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-start gap-2"><span className="text-yellow-400">1ª violação:</span> Remoção do anúncio + aviso</li>
            <li className="flex items-start gap-2"><span className="text-orange-400">2ª violação:</span> Suspensão temporária (7 dias)</li>
            <li className="flex items-start gap-2"><span className="text-red-400">3ª violação:</span> Banimento permanente da plataforma</li>
          </ul>
        </div>

        <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-white font-bold mb-3">Denunciar um anúncio</h2>
          <p className="text-gray-400 text-sm mb-3">Encontrou um produto proibido? Denuncie clicando no botão "Denunciar" na página do anúncio ou entre em contato:</p>
          <a href="mailto:denuncia@compreouvenda.com" className="text-purple-400 hover:text-purple-300 text-sm font-medium">denuncia@compreouvenda.com</a>
        </div>

        <p className="text-gray-500 text-xs text-center mt-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
  );
}
