'use client'

import { AlertTriangle, Ban, Shield } from 'lucide-react'

const prohibitedCategories = [
  {
    title: 'Armas e Munições',
    items: ['Armas de fogo', 'Munições', 'Armas brancas com finalidade ofensiva', 'Réplicas e simulacros', 'Coletes balísticos']
  },
  {
    title: 'Drogas e Substâncias Controladas',
    items: ['Drogas ilícitas', 'Medicamentos sem prescrição', 'Anabolizantes', 'Substâncias psicoativas', 'Equipamentos para uso de drogas']
  },
  {
    title: 'Produtos Falsificados',
    items: ['Réplicas de marcas registradas', 'Documentos falsos', 'Dinheiro falsificado', 'Certificados fraudulentos', 'Software pirata']
  },
  {
    title: 'Conteúdo Ilegal',
    items: ['Material de exploração infantil', 'Conteúdo que incite violência', 'Material de ódio/discriminação', 'Dados pessoais de terceiros', 'Conteúdo difamatório']
  },
  {
    title: 'Produtos Perigosos',
    items: ['Explosivos', 'Material radioativo', 'Produtos químicos restritos', 'Fogos de artifício ilegais', 'Venenos sem registro']
  },
  {
    title: 'Animais e Vida Silvestre',
    items: ['Animais silvestres', 'Espécies ameaçadas', 'Partes de animais protegidos', 'Animais vivos sem autorização', 'Produtos de origem animal proibidos']
  },
  {
    title: 'Produtos Regulados',
    items: ['Tabaco e cigarros eletrônicos', 'Bebidas alcoólicas sem licença', 'Agrotóxicos não registrados', 'Equipamentos de telecomunicação não homologados']
  },
  {
    title: 'Serviços Proibidos',
    items: ['Serviços sexuais', 'Hacking e invasão de sistemas', 'Lavagem de dinheiro', 'Esquemas de pirâmide', 'Jogos de azar ilegais']
  }
]

export default function ProhibitedPoliciesPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold">Política de Produtos Proibidos</h1>
        <p className="text-gray-600">
          Para manter nossa comunidade segura, os seguintes itens e serviços são proibidos na plataforma.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-800">Importante</h3>
            <p className="text-sm text-red-700">
              Anúncios que violem esta política serão removidos imediatamente. 
              Reincidências podem resultar em suspensão permanente da conta e 
              comunicação às autoridades competentes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {prohibitedCategories.map((category, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Ban size={18} className="text-red-500" />
              {category.title}
            </h2>
            <ul className="space-y-1">
              {category.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-purple-900">Como reportar</h2>
        <p className="text-sm text-purple-800">
          Se você encontrar um anúncio que viole esta política:
        </p>
        <ol className="text-sm text-purple-800 space-y-1 list-decimal pl-5">
          <li>Clique no botão &quot;Denunciar&quot; no anúncio</li>
          <li>Selecione o motivo da denúncia</li>
          <li>Nossa equipe analisará em até 24 horas</li>
        </ol>
        <p className="text-sm text-purple-800">
          Denúncias urgentes: <strong>contato@compreouvenda.com</strong>
        </p>
      </div>

      <div className="text-center text-xs text-gray-500 pb-8">
        Última atualização: Maio 2026 • CompreOuVenda.com
      </div>
    </div>
  )
}
