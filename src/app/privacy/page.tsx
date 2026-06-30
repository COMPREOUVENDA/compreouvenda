import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Política de Privacidade - CompreOuVenda',
  description:
    'Leia a Política de Privacidade do CompreOuVenda. Entenda como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a LGPD.',
  keywords: [
    'política de privacidade',
    'LGPD',
    'proteção de dados',
    'CompreOuVenda',
    'privacidade',
    'dados pessoais',
  ],
  authors: [{ name: 'CompreOuVenda LTDA' }],
  creator: 'CompreOuVenda LTDA',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://compreouvenda.vercel.app/privacidade',
    siteName: 'CompreOuVenda',
    title: 'Política de Privacidade - CompreOuVenda',
    description:
      'Política de Privacidade do CompreOuVenda em conformidade com a LGPD.',
    images: [{ url: '/logo-full.png', width: 1280, height: 853, alt: 'CompreOuVenda' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Política de Privacidade - CompreOuVenda',
    description: 'Política de Privacidade do CompreOuVenda em conformidade com a LGPD.',
    images: ['/logo-full.png'],
  },
  alternates: {
    canonical: 'https://compreouvenda.vercel.app/privacidade',
  },
};

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen"
      style={{ backgroundColor: '#0D0B1F' }}
    >
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          {/* Header */}
          <header className="mb-12">
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: '#F5921E' }}
            >
              Política de Privacidade
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Esta Política de Privacidade descreve como a <strong className="text-gray-200">CompreOuVenda</strong> coleta, usa, armazena e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
            </p>
            <p className="text-gray-500 text-xs mt-3">
              Última atualização: <time dateTime="2026-05-15">15 de maio de 2026</time> — Versão 1.0
            </p>
          </header>

          {/* 1. Controlador */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              1. Controlador de Dados
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-2">
              <p>
                <strong className="text-white">Razão Social:</strong> CompreOuVenda LTDA
              </p>
              <p>
                <strong className="text-white">CNPJ:</strong> Em processo de registro
              </p>
              <p>
                <strong className="text-white">Endereço:</strong> Brasil
              </p>
              <p>
                <strong className="text-white">E-mail de contato:</strong>{' '}
                <a
                  href="mailto:contato@compreouvenda.com"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  contato@compreouvenda.com
                </a>
              </p>
            </div>
          </section>

          {/* 2. DPO */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              2. Encarregado de Dados (DPO)
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              O Encarregado de Proteção de Dados (DPO) é o canal de comunicação entre a CompreOuVenda, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <div className="mt-3 text-gray-300 text-sm md:text-base leading-relaxed space-y-2">
              <p>
                <strong className="text-white">Nome:</strong> [placeholder nome]
              </p>
              <p>
                <strong className="text-white">E-mail:</strong>{' '}
                <a
                  href="mailto:[placeholder email]"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  [placeholder email]
                </a>
              </p>
            </div>
          </section>

          {/* 3. Dados coletados */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              3. Dados Coletados e Finalidades
            </h2>
            <div className="space-y-6 text-gray-300 text-sm md:text-base leading-relaxed">
              <div>
                <h3 className="text-white font-semibold mb-1">3.1 Dados de Cadastro</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> nome completo, e-mail, telefone, CPF/CNPJ e data de nascimento.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> execução do contrato de uso da plataforma, identificação do usuário, prevenção de fraudes e cumprimento de obrigações legais.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-1">3.2 Dados de Localização</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> cidade e estado obtidos via geolocalização do dispositivo ou endereço informado.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> execução do contrato — conectar compradores e vendedores próximos, personalizar o feed de produtos e calcular frete.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-1">3.3 Dados de Pagamento</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> informações de pagamento processadas diretamente pelo gateway de pagamento parceiro (dados do cartão, chaves PIX, etc.).
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> execução do contrato e obrigação legal — processar transações, emitir notas fiscais e cumprir obrigações tributárias.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-1">3.4 Mensagens</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> conteúdo das conversas trocadas entre usuários via chat da plataforma.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> execução do contrato — viabilizar a comunicação entre as partes para concretização de negócios.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-1">3.5 Avaliações e Favoritos</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> notas, comentários, reclamações e lista de produtos favoritados.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> legítimo interesse — manter a reputação e confiabilidade da plataforma, melhorar a experiência do usuário e recomendar produtos.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-1">3.6 Cookies e Tecnologias Semelhantes</h3>
                <p>
                  <strong className="text-gray-200">Dados:</strong> identificadores de sessão, preferências de navegação, dados de analytics e publicidade.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> consentimento — melhorar a usabilidade, personalizar conteúdo, medir audiência e veicular anúncios relevantes.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Bases legais */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              4. Bases Legais para o Tratamento
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
              Em conformidade com os artigos 7º e 8º da LGPD, o tratamento de dados pessoais na CompreOuVenda baseia-se nas seguintes hipóteses:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm md:text-base leading-relaxed">
              <li>
                <strong className="text-white">Execução de contrato ou de procedimentos preliminares (art. 7º, V):</strong> cadastro, localização, pagamentos, mensagens e entrega de produtos.
              </li>
              <li>
                <strong className="text-white">Obrigação legal ou regulatória (art. 7º, II):</strong> retenção de registros fiscais, prevenção à lavagem de dinheiro e cumprimento de ordens judiciais.
              </li>
              <li>
                <strong className="text-white">Legítimo interesse (art. 7º, IX):</strong> avaliações, favoritos, segurança da plataforma, prevenção de fraudes e melhoria dos serviços.
              </li>
              <li>
                <strong className="text-white">Consentimento (art. 7º, I e art. 8º, §4º):</strong> cookies não essenciais, marketing direcionado e compartilhamento de dados para parceiros comerciais.
              </li>
              <li>
                <strong className="text-white">Exercício regular de direitos (art. 7º, VI):</strong> defesa judicial ou administrativa da CompreOuVenda.
              </li>
            </ul>
          </section>

          {/* 5. Compartilhamento */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              5. Compartilhamento com Operadores
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
              A CompreOuVenda pode compartilhar dados pessoais com operadores de dados, sempre sob contrato e para finalidades específicas:
            </p>
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-1">Supabase, Inc. (EUA)</h3>
                <p>
                  <strong className="text-gray-200">Serviços:</strong> banco de dados, autenticação, armazenamento de arquivos (storage) e comunicação em tempo real (realtime).
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> hospedar e processar os dados da plataforma de forma segura e escalável.
                </p>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-1">Vercel, Inc. (EUA)</h3>
                <p>
                  <strong className="text-gray-200">Serviços:</strong> hospedagem e entrega de conteúdo (hosting e CDN).
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> disponibilizar o site e a aplicação de forma rápida e estável aos usuários.
                </p>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-1">OpenStreetMap / Nominatim (Internacional)</h3>
                <p>
                  <strong className="text-gray-200">Serviços:</strong> geocodificação e serviços de mapa.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> converter endereços em coordenadas geográficas e exibir mapas de localização.
                </p>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-1">Gateway de Pagamento (Brasil)</h3>
                <p>
                  <strong className="text-gray-200">Serviços:</strong> processamento de pagamentos via cartão de crédito, boleto e PIX.
                </p>
                <p>
                  <strong className="text-gray-200">Finalidade:</strong> viabilizar transações financeiras de forma segura entre compradores e vendedores.
                </p>
              </div>
            </div>
          </section>

          {/* 5.1 Inventário de Fornecedores Terceiros */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              5.1 Inventário de Fornecedores Terceiros (Sub-operadores)
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-5">
              A tabela abaixo lista todos os fornecedores terceiros que atuam como sub-operadores no tratamento de dados pessoais dos titulares, conforme exigido pelo art. 37 da LGPD. As transferências internacionais são amparadas por instrumentos jurídicos adequados (cláusulas contratuais padrão — SCCs — ou DPA vigente).
            </p>
            <div className="overflow-x-auto rounded-xl border border-purple-900/40">
              <table className="w-full text-sm text-gray-300 border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(91,45,142,0.22)' }}>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-purple-900/40 whitespace-nowrap">Fornecedor</th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-purple-900/40">Serviços Prestados</th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-purple-900/40 whitespace-nowrap">Localização</th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-purple-900/40 whitespace-nowrap">Base Contratual</th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-purple-900/40">Dados Envolvidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/20">
                  <tr className="hover:bg-purple-900/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-white align-top whitespace-nowrap">Supabase, Inc.</td>
                    <td className="px-4 py-3 align-top text-gray-300">Banco de dados (PostgreSQL), autenticação, armazenamento de arquivos (Storage) e comunicação em tempo real (Realtime)</td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(91,45,142,0.3)', color: '#c4b5fd' }}>AWS São Paulo</span>
                      <span className="block text-xs text-gray-500 mt-1">Backups: EUA</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-purple-300">Cláusulas Contratuais Padrão (SCCs)</span>
                      <br />
                      <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2 text-gray-400 hover:text-white transition-colors">DPA disponível</a>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-400 text-xs">Nome, e-mail, telefone, CPF/CNPJ, localização, mensagens, fotos, avaliações, pedidos, preferências</td>
                  </tr>
                  <tr className="hover:bg-purple-900/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-white align-top whitespace-nowrap">Vercel, Inc.</td>
                    <td className="px-4 py-3 align-top text-gray-300">Hospedagem da aplicação (Next.js), CDN global e entrega de conteúdo estático</td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(91,45,142,0.3)', color: '#c4b5fd' }}>EUA / CDN Global</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-purple-300">DPA vigente</span>
                      <br />
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2 text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-400 text-xs">Endereço IP, logs de requisição HTTP, cookies de sessão, métricas de performance</td>
                  </tr>
                  <tr className="hover:bg-purple-900/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-white align-top whitespace-nowrap">OpenStreetMap /<br />Nominatim</td>
                    <td className="px-4 py-3 align-top text-gray-300">Geocodificação de endereços (texto → coordenadas geográficas) e exibição de mapas</td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(91,45,142,0.3)', color: '#c4b5fd' }}>Internacional (EU/EUA)</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-purple-300">Dados públicos anonimizados</span>
                      <br />
                      <span className="text-xs text-gray-500">Open Database License (ODbL)</span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-400 text-xs">Apenas texto de endereço (cidade/estado) sem dados pessoais identificáveis do usuário</td>
                  </tr>
                  <tr className="hover:bg-purple-900/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-white align-top whitespace-nowrap">Gateway de Pagamento</td>
                    <td className="px-4 py-3 align-top text-gray-300">Processamento de pagamentos (cartão, boleto, PIX) e split financeiro entre partes da transação</td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(91,45,142,0.3)', color: '#c4b5fd' }}>Brasil</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-purple-300">PCI DSS Nível 1</span>
                      <br />
                      <span className="text-xs text-gray-500">Contrato LGPD + DPA vigente</span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-400 text-xs">Dados financeiros tokenizados (cartão, PIX, boleto), CPF/CNPJ para antifraude, histórico de transações</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-gray-500 text-xs leading-relaxed">
              * Todos os contratos com sub-operadores incluem cláusulas de proteção de dados, limitação de finalidade e obrigação de notificação de incidentes em até 72h. Atualizado em: 15/05/2026.
            </p>
          </section>

          {/* 6. Transferência internacional */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              6. Transferência Internacional de Dados
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Alguns dos nossos operadores (Supabase e Vercel) estão sediados nos Estados Unidos. A transferência internacional de dados pessoais é realizada com as seguintes salvaguardas:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-300 text-sm md:text-base leading-relaxed">
              <li>
                <strong className="text-white">Cláusulas contratuais padrão (SCCs):</strong> celebradas entre a CompreOuVenda e os operadores internacionais, garantindo nível de proteção adequado.
              </li>
              <li>
                <strong className="text-white">Criptografia em trânsito e em repouso:</strong> todos os dados são transmitidos via TLS 1.3 e armazenados com criptografia AES-256.
              </li>
              <li>
                <strong className="text-white">Controles de acesso rigorosos:</strong> Row Level Security (RLS) no banco de dados e autenticação JWT.
              </li>
            </ul>
          </section>

          {/* 7. Direitos do titular */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              7. Direitos dos Titulares de Dados
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
              Nos termos do art. 18 da LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm md:text-base leading-relaxed">
              <li>
                <strong className="text-white">Acesso:</strong> confirmar a existência de tratamento e obter uma cópia dos seus dados.
              </li>
              <li>
                <strong className="text-white">Correção:</strong> solicitar a retificação de dados incompletos, inexatos ou desatualizados.
              </li>
              <li>
                <strong className="text-white">Exclusão (direito ao esquecimento):</strong> pedir a eliminação dos dados desnecessários ou excessivos, salvo nas hipóteses legais de retenção.
              </li>
              <li>
                <strong className="text-white">Portabilidade:</strong> receber seus dados em formato estruturado e interoperável, para transferência a outro serviço.
              </li>
              <li>
                <strong className="text-white">Revogação do consentimento:</strong> retirar o consentimento a qualquer tempo, quando o tratamento se basear nessa hipótese legal.
              </li>
              <li>
                <strong className="text-white">Oposição:</strong> discordar do tratamento realizado com base no legítimo interesse, mediante fundamentação.
              </li>
              <li>
                <strong className="text-white">Informação sobre compartilhamento:</strong> saber com quais terceiros seus dados foram compartilhados.
              </li>
            </ul>
            <div className="mt-5 p-4 rounded-xl border border-white/10">
              <p className="text-gray-200 text-sm md:text-base font-medium mb-2">
                Como exercer seus direitos:
              </p>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                Você pode exercer seus direitos diretamente pelo painel da sua conta (Dashboard &gt; Configurações &gt; Privacidade) ou enviando uma solicitação para{' '}
                <a
                  href="mailto:contato@compreouvenda.com"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  contato@compreouvenda.com
                </a>
                . Responderemos em até 15 (quinze) dias úteis, conforme previsto na LGPD.
              </p>
            </div>
          </section>

          {/* 8. Retenção de Dados */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              8. Retenção de Dados
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-5">
              A CompreOuVenda mantém os dados pessoais pelo tempo estritamente necessário para cumprir as finalidades descritas nesta política ou para atender a obrigações legais. A tabela abaixo detalha os prazos por categoria de dado:
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm md:text-base text-gray-300 border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(91,45,142,0.18)' }}>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-white/10">
                      Categoria de Dado
                    </th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-white/10">
                      Prazo de Retenção
                    </th>
                    <th className="text-left text-white font-semibold px-4 py-3 border-b border-white/10">
                      Fundamento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Conta / Perfil</td>
                    <td className="px-4 py-3 align-top">
                      Mantidos enquanto a conta estiver ativa; <strong className="text-gray-200">5 anos</strong> após a exclusão
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Marco Civil da Internet (art. 15)</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Pedidos / Pagamentos</td>
                    <td className="px-4 py-3 align-top">
                      <strong className="text-gray-200">5 anos</strong>
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Obrigação fiscal brasileira (CTN e legislação tributária)</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Mensagens (chat)</td>
                    <td className="px-4 py-3 align-top">
                      <strong className="text-gray-200">2 anos</strong> após a última atividade no chat
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Legítimo interesse — resolução de disputas</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Notificações / Push</td>
                    <td className="px-4 py-3 align-top">
                      <strong className="text-gray-200">6 meses</strong>
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Legítimo interesse — relevância operacional</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Logs de Auditoria</td>
                    <td className="px-4 py-3 align-top">
                      <strong className="text-gray-200">2 anos</strong>
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Segurança, prevenção de fraudes e resolução de disputas</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Favoritos</td>
                    <td className="px-4 py-3 align-top">
                      Excluídos junto com a conta
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Sem base legal para retenção após encerramento</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium align-top">Dados de Navegação / Cookies</td>
                    <td className="px-4 py-3 align-top">
                      Sessão (cookies de sessão) ou <strong className="text-gray-200">1 ano</strong> (cookies persistentes), conforme preferência do usuário
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">Consentimento (revogável a qualquer tempo)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 9. Procedimento de Descarte */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              9. Procedimento de Descarte
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
              Ao término dos prazos estabelecidos na seção anterior, a CompreOuVenda adota os seguintes procedimentos para o tratamento final dos dados:
            </p>
            <ul className="list-disc list-inside space-y-3 text-gray-300 text-sm md:text-base leading-relaxed mb-5">
              <li>
                <strong className="text-white">Anonimização ou exclusão definitiva:</strong> os dados são anonimizados de forma irreversível (tornando impossível a reidentificação do titular) ou excluídos permanentemente dos nossos sistemas e backups.
              </li>
              <li>
                <strong className="text-white">Processo automatizado e revisado trimestralmente:</strong> rotinas automáticas identificam e processam dados vencidos; o processo completo é auditado a cada trimestre pela equipe de segurança e pelo DPO.
              </li>
              <li>
                <strong className="text-white">Transações fiscais:</strong> registros relacionados a obrigações tributárias <strong className="text-gray-200">nunca são excluídos antes do prazo legal</strong> de 5 anos, mesmo que o titular solicite a exclusão da conta.
              </li>
              <li>
                <strong className="text-white">Ordens judiciais:</strong> em caso de determinação judicial ou administrativa, a exclusão pode ser suspensa pelo período necessário ao cumprimento da ordem, retomando-se o descarte ao final.
              </li>
            </ul>
            <div className="p-4 rounded-xl border border-white/10">
              <p className="text-gray-200 text-sm md:text-base font-medium mb-2">
                Solicitação de exclusão antecipada
              </p>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                Você pode solicitar a exclusão antecipada de dados não sujeitos a retenção legal pelo painel da sua conta (Dashboard &gt; Configurações &gt; Privacidade) ou enviando e-mail para{' '}
                <a
                  href="mailto:contato@compreouvenda.com"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  contato@compreouvenda.com
                </a>
                . Atenderemos a solicitação em até 15 (quinze) dias úteis.
              </p>
            </div>
          </section>

          {/* 10. Segurança */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              10. Medidas de Segurança
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-3">
              Adotamos medidas técnicas e organizacionais para proteger seus dados pessoais contra acessos não autorizados, perda, destruição ou vazamento:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm md:text-base leading-relaxed">
              <li>
                <strong className="text-white">Criptografia TLS 1.3:</strong> todas as comunicações entre o usuário e a plataforma são criptografadas.
              </li>
              <li>
                <strong className="text-white">Row Level Security (RLS):</strong> políticas de acesso a nível de linha no banco de dados Supabase, garantindo que cada usuário acesse apenas seus próprios dados.
              </li>
              <li>
                <strong className="text-white">Autenticação JWT:</strong> tokens seguros e com expiração controlada para sessões de usuário.
              </li>
              <li>
                <strong className="text-white">Logs de auditoria:</strong> registro de ações críticas para detecção de anomalias e investigação de incidentes.
              </li>
              <li>
                <strong className="text-white">Senhas criptografadas:</strong> armazenamento de credenciais com algoritmos de hash seguros (bcrypt/Argon2).
              </li>
              <li>
                <strong className="text-white">Ambientes isolados:</strong> separação entre ambientes de produção, homologação e desenvolvimento.
              </li>
            </ul>
          </section>

          {/* 11. Incidentes */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              11. Incidentes de Segurança
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares de dados, a CompreOuVenda se compromete a notificar a ANPD e os titulares afetados em até <strong className="text-white">72 (setenta e duas) horas</strong> após a constatação do incidente, conforme exigido pela LGPD. A notificação conterá informações sobre a natureza do incidente, dados envolvidos, medidas corretivas adotadas e orientações aos titulares.
            </p>
          </section>

          {/* 12. Alterações */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              12. Alterações nesta Política
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças nos serviços, na legislação ou nas práticas de privacidade. A versão atual e a data da última atualização são sempre indicadas no início deste documento. Recomendamos que você a revise regularmente. Alterações substanciais serão comunicadas por e-mail ou por meio de aviso em destaque na plataforma.
            </p>
          </section>

          {/* 13. Contato */}
          <section className="mb-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#5B2D8E' }}>
              13. Contato
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Se tiver dúvidas, sugestões ou reclamações sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, entre em contato conosco:
            </p>
            <div className="mt-3 text-gray-300 text-sm md:text-base leading-relaxed space-y-1">
              <p>
                <strong className="text-white">E-mail:</strong>{' '}
                <a
                  href="mailto:contato@compreouvenda.com"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  contato@compreouvenda.com
                </a>
              </p>
              <p>
                <strong className="text-white">DPO:</strong>{' '}
                <a
                  href="mailto:[placeholder email]"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                  style={{ color: '#F5921E' }}
                >
                  [placeholder email]
                </a>
              </p>
            </div>
          </section>

          {/* Footer note */}
          <footer className="pt-8 border-t border-white/10">
            <p className="text-gray-500 text-xs text-center">
              © {new Date().getFullYear()} CompreOuVenda LTDA. Todos os direitos reservados. Política de Privacidade v1.0 — atualizada em 15/05/2026.
            </p>
          </footer>
        </div>
    </main>
  );
}
