'use client';

import { Metadata } from 'next';
import Head from 'next/head';

export const dynamic = 'force-dynamic';

const pageMetadata: Metadata = {
  title: 'Termos de Uso - CompreOuVenda',
  description:
    'Leia os Termos de Uso do CompreOuVenda. Conheça as regras de cadastro, anúncios, transações, doações e conduta na plataforma de marketplace C2C.',
  keywords: [
    'termos de uso',
    'termos e condições',
    'marketplace',
    'CompreOuVenda',
    'compra e venda',
    'doação',
    'C2C',
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
    url: 'https://compreouvenda.vercel.app/terms',
    siteName: 'CompreOuVenda',
    title: 'Termos de Uso - CompreOuVenda',
    description:
      'Conheça os Termos de Uso do marketplace CompreOuVenda: cadastro, anúncios, transações e doações.',
    images: [{ url: '/logo-full.png', width: 1280, height: 853, alt: 'CompreOuVenda' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Termos de Uso - CompreOuVenda',
    description:
      'Conheça os Termos de Uso do marketplace CompreOuVenda: cadastro, anúncios, transações e doações.',
    images: ['/logo-full.png'],
  },
  alternates: {
    canonical: 'https://compreouvenda.vercel.app/terms',
  },
};

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Termos de Uso - CompreOuVenda</title>
        <meta
          name="description"
          content="Leia os Termos de Uso do CompreOuVenda. Conheça as regras de cadastro, anúncios, transações, doações e conduta na plataforma de marketplace C2C."
        />
        <link rel="canonical" href="https://compreouvenda.vercel.app/terms" />
        <meta property="og:title" content="Termos de Uso - CompreOuVenda" />
        <meta
          property="og:description"
          content="Conheça os Termos de Uso do marketplace CompreOuVenda: cadastro, anúncios, transações e doações."
        />
        <meta property="og:url" content="https://compreouvenda.vercel.app/terms" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="CompreOuVenda" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Termos de Uso - CompreOuVenda" />
        <meta
          name="twitter:description"
          content="Conheça os Termos de Uso do marketplace CompreOuVenda: cadastro, anúncios, transações e doações."
        />
      </Head>

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
              Termos de Uso
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Bem-vindo à <strong className="text-gray-200">CompreOuVenda</strong>. Ao acessar ou utilizar nossa plataforma, você concorda integralmente com os presentes Termos de Uso. Leia-os com atenção antes de prosseguir.
            </p>
            <p className="text-gray-500 text-xs mt-3">
              Última atualização: <time dateTime="2026-05-15">15 de maio de 2026</time> — Versão 1.0
            </p>
          </header>

          {/* 1. Objeto */}
          <section className="mb-10" aria-labelledby="section-objeto">
            <h2
              id="section-objeto"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              1. Objeto
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-3">
              <p>
                A <strong className="text-white">CompreOuVenda</strong> é uma plataforma de marketplace <strong className="text-white">C2C (Consumer to Consumer)</strong> que conecta pessoas físicas e jurídicas para a <strong className="text-white">compra, venda e doação de produtos</strong> novos ou usados, por meio de anúncios publicados pelos próprios usuários.
              </p>
              <p>
                A plataforma atua exclusivamente como intermediária tecnológica, disponibilizando os recursos necessários para que compradores e vendedores se encontrem e realizem negócios de forma autônoma, sem que a CompreOuVenda seja parte integrante das transações.
              </p>
              <p>
                Os presentes Termos de Uso regulamentam o acesso e a utilização de todos os serviços disponibilizados pela CompreOuVenda, incluindo o site, aplicativo móvel, APIs e demais ferramentas da plataforma.
              </p>
            </div>
          </section>

          {/* 2. Aceite */}
          <section className="mb-10" aria-labelledby="section-aceite">
            <h2
              id="section-aceite"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              2. Aceite dos Termos
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-3">
              <p>
                Ao acessar, navegar ou utilizar qualquer funcionalidade da plataforma CompreOuVenda — seja por meio do site, do aplicativo ou de qualquer outro canal disponibilizado — o usuário <strong className="text-white">declara ter lido, compreendido e concordado</strong> com todos os termos, condições, políticas e diretrizes aqui estabelecidos.
              </p>
              <p>
                Caso o usuário não concorde com qualquer disposição destes Termos, deverá abster-se de utilizar a plataforma. O uso continuado após eventuais atualizações dos Termos implica na aceitação das novas versões.
              </p>
              <div className="border-l-4 pl-4 mt-4" style={{ borderColor: '#F5921E' }}>
                <p className="text-gray-400 text-xs">
                  <strong className="text-gray-200">Versão atual:</strong> 1.0 &nbsp;|&nbsp;
                  <strong className="text-gray-200">Data de vigência:</strong> 15 de maio de 2026
                </p>
              </div>
            </div>
          </section>

          {/* 3. Cadastro */}
          <section className="mb-10" aria-labelledby="section-cadastro">
            <h2
              id="section-cadastro"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              3. Cadastro e Conta de Usuário
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">3.1 Requisitos de Elegibilidade</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-gray-200">Pessoa Física (PF):</strong> é necessário ter no mínimo <strong className="text-white">18 (dezoito) anos completos</strong> e possuir CPF válido emitido pela Receita Federal do Brasil.
                  </li>
                  <li>
                    <strong className="text-gray-200">Pessoa Jurídica (PJ):</strong> é necessário possuir <strong className="text-white">CNPJ ativo e regular</strong> perante os órgãos competentes, representado por pessoa física devidamente autorizada.
                  </li>
                  <li>
                    Menores de 18 anos somente poderão utilizar a plataforma com o consentimento expresso de pais ou responsáveis legais, que assumirão responsabilidade solidária pelos atos praticados.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3.2 Veracidade das Informações</h3>
                <p>
                  O usuário se compromete a fornecer dados <strong className="text-white">verdadeiros, precisos, atuais e completos</strong> no momento do cadastro e a mantê-los atualizados durante toda a vigência da conta. A CompreOuVenda reserva-se o direito de suspender ou excluir contas com informações falsas, incompletas ou desatualizadas.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3.3 Unicidade da Conta</h3>
                <p>
                  É permitida <strong className="text-white">apenas uma conta por pessoa física ou jurídica</strong>. A criação de múltiplas contas para obtenção de vantagens, burla de restrições ou qualquer outra finalidade é expressamente proibida e sujeita à suspensão permanente de todas as contas envolvidas.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3.4 Segurança das Credenciais</h3>
                <p>
                  O usuário é <strong className="text-white">integralmente responsável</strong> pela confidencialidade de suas credenciais de acesso (e-mail e senha) e por todas as atividades realizadas em sua conta. Em caso de acesso não autorizado, o usuário deve notificar imediatamente a CompreOuVenda pelo e-mail{' '}
                  <a
                    href="mailto:contato@compreouvenda.com"
                    className="underline underline-offset-4 hover:text-white transition-colors"
                    style={{ color: '#F5921E' }}
                  >
                    contato@compreouvenda.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* 4. Anúncios */}
          <section className="mb-10" aria-labelledby="section-anuncios">
            <h2
              id="section-anuncios"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              4. Anúncios
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">4.1 Responsabilidade pelo Anúncio</h3>
                <p>
                  O usuário anunciante é <strong className="text-white">exclusivamente responsável</strong> pelo conteúdo de seus anúncios, incluindo preços, descrições, condições do produto, fotos e demais informações divulgadas. A CompreOuVenda não verifica previamente a veracidade das informações publicadas e não se responsabiliza por imprecisões ou omissões cometidas pelo anunciante.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">4.2 Padrões de Qualidade</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-gray-200">Preços:</strong> devem ser indicados em reais (BRL) e refletir o valor real praticado pelo anunciante.
                  </li>
                  <li>
                    <strong className="text-gray-200">Descrições:</strong> devem ser claras, precisas e não induzir o comprador a erro quanto às características, estado de conservação ou funcionalidades do produto.
                  </li>
                  <li>
                    <strong className="text-gray-200">Fotos:</strong> devem ser reais, do próprio produto anunciado, sem edições enganosas. É vedado o uso de imagens de terceiros sem autorização.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">4.3 Itens Proibidos</h3>
                <p className="mb-2">
                  É expressamente vedado anunciar na plataforma CompreOuVenda:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Armas de fogo, munições, explosivos e acessórios de uso restrito;</li>
                  <li>Drogas, entorpecentes, substâncias controladas ou insumos para produção ilícita;</li>
                  <li>Produtos falsificados, pirateados ou que violem direitos de propriedade intelectual;</li>
                  <li>Animais silvestres, produtos de origem animal protegida ou espécies em extinção;</li>
                  <li>Medicamentos sujeitos a controle especial sem autorização legal;</li>
                  <li>Conteúdo pornográfico, obsceno ou que envolva menores de idade;</li>
                  <li>Serviços ou produtos que incentivem discriminação, ódio ou violência;</li>
                  <li>Quaisquer itens cuja comercialização seja proibida pela legislação brasileira vigente.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">4.4 Remoção de Anúncios</h3>
                <p>
                  A CompreOuVenda reserva-se o direito de <strong className="text-white">remover, suspender ou moderar qualquer anúncio</strong> que viole estes Termos, as leis vigentes ou os padrões da comunidade, a qualquer tempo e sem necessidade de aviso prévio, sem que isso gere qualquer direito de indenização ao anunciante.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Transações */}
          <section className="mb-10" aria-labelledby="section-transacoes">
            <h2
              id="section-transacoes"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              5. Transações
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">5.1 Papel da Plataforma</h3>
                <p>
                  A CompreOuVenda atua como <strong className="text-white">intermediária tecnológica</strong>, conectando compradores e vendedores. A plataforma <strong className="text-white">não é parte nas transações</strong> comerciais realizadas entre os usuários, não sendo responsável pelo cumprimento de obrigações contratuais, qualidade dos produtos, entrega ou qualquer aspecto da negociação entre as partes.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">5.2 Gateway de Pagamento</h3>
                <p>
                  Os pagamentos realizados na plataforma são processados por um <strong className="text-white">gateway de pagamento parceiro</strong>, que opera de forma independente e em conformidade com as regulamentações financeiras brasileiras. A CompreOuVenda não armazena dados de cartão de crédito ou informações financeiras sensíveis dos usuários.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">5.3 Comissão da Plataforma</h3>
                <p>
                  Sobre cada transação finalizada com sucesso na plataforma, a CompreOuVenda cobra uma <strong className="text-white">comissão de 10% (dez por cento)</strong> sobre o valor total da venda. Essa taxa é descontada automaticamente no momento da liquidação financeira ao vendedor. A comissão pode ser revisada mediante notificação prévia aos usuários.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">5.4 Estorno e Cancelamento</h3>
                <p>
                  Solicitações de estorno ou cancelamento devem ser encaminhadas dentro dos prazos previstos pelo gateway de pagamento e pela legislação de defesa do consumidor (Código de Defesa do Consumidor — Lei nº 8.078/1990). A CompreOuVenda atuará como facilitadora na mediação de tais solicitações.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Doações */}
          <section className="mb-10" aria-labelledby="section-doacoes">
            <h2
              id="section-doacoes"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              6. Doações
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">6.1 Funcionalidade de Doação</h3>
                <p>
                  A plataforma CompreOuVenda oferece a funcionalidade de <strong className="text-white">destinação de parte do valor da venda a instituições beneficentes</strong>. Ao realizar uma venda, o usuário pode optar por direcionar um percentual do valor recebido a uma instituição cadastrada na plataforma.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">6.2 Escolha da Instituição</h3>
                <p>
                  O usuário vendedor poderá <strong className="text-white">escolher livremente</strong> a instituição beneficente destinatária, dentre as organizações cadastradas e verificadas pela CompreOuVenda, preferencialmente instituições locais à região do vendedor, promovendo o impacto social nas comunidades.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">6.3 Repasse pela Plataforma</h3>
                <p>
                  A CompreOuVenda é responsável por <strong className="text-white">receber e repassar os valores de doação</strong> às instituições selecionadas, cumprindo os prazos e procedimentos estabelecidos. O comprovante de repasse estará disponível para consulta no painel do usuário. A plataforma não retém valores destinados a doações além do período necessário para processamento.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">6.4 Cadastro de Produtos para Doação</h3>
                <p>
                  Além de vendas com destinação parcial à caridade, os usuários também podem anunciar produtos diretamente para <strong className="text-white">doação gratuita</strong> a outros usuários, sem nenhum valor financeiro envolvido. Nesses casos, a plataforma não cobra comissão e o contato entre as partes é facilitado pelo chat integrado.
                </p>
              </div>
            </div>
          </section>

          {/* 7. Conduta */}
          <section className="mb-10" aria-labelledby="section-conduta">
            <h2
              id="section-conduta"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              7. Conduta do Usuário
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-4">
              <p>
                Ao utilizar a plataforma CompreOuVenda, o usuário concorda em observar padrões de conduta ética e legal. São expressamente <strong className="text-white">proibidas</strong> as seguintes práticas:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-gray-200">Fraude:</strong> emissão de avaliações falsas, adulteração de informações de produtos, criação de transações fictícias ou qualquer forma de engano a outros usuários ou à plataforma.
                </li>
                <li>
                  <strong className="text-gray-200">Spam:</strong> envio de mensagens comerciais não solicitadas, uso de bots para automatizar interações, publicação repetitiva de anúncios idênticos ou abusivos.
                </li>
                <li>
                  <strong className="text-gray-200">Discurso de ódio:</strong> publicação de conteúdo que incite discriminação ou violência com base em raça, etnia, gênero, orientação sexual, religião, nacionalidade, deficiência ou qualquer outra característica protegida por lei.
                </li>
                <li>
                  <strong className="text-gray-200">Conteúdo ilegal:</strong> divulgação de informações que violem a legislação brasileira, incluindo conteúdo calunioso, difamatório, obsceno, que viole a privacidade de terceiros ou que incite a prática de crimes.
                </li>
                <li>
                  <strong className="text-gray-200">Violação de direitos autorais:</strong> uso não autorizado de textos, imagens, vídeos, marcas, logotipos ou qualquer conteúdo protegido por propriedade intelectual de terceiros.
                </li>
                <li>
                  <strong className="text-gray-200">Violação de segurança:</strong> tentativas de acessar sistemas, dados ou contas de outros usuários sem autorização, incluindo ataques de engenharia social, phishing ou exploração de vulnerabilidades.
                </li>
                <li>
                  <strong className="text-gray-200">Desvio de transações:</strong> induzir outros usuários a realizar negociações fora da plataforma com o objetivo de burlar a comissão ou as proteções oferecidas pelo sistema.
                </li>
              </ul>
              <p>
                O descumprimento dessas regras poderá acarretar a suspensão temporária ou exclusão definitiva da conta, além de responsabilidade civil e criminal do infrator.
              </p>
            </div>
          </section>

          {/* 8. Propriedade Intelectual */}
          <section className="mb-10" aria-labelledby="section-propriedade">
            <h2
              id="section-propriedade"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              8. Propriedade Intelectual
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">8.1 Marca CompreOuVenda</h3>
                <p>
                  A marca <strong className="text-white">CompreOuVenda</strong>, seu logotipo, design, identidade visual, nome de domínio e demais elementos de identificação são de titularidade exclusiva da CompreOuVenda LTDA e protegidos pelas leis de propriedade industrial vigentes. É vedada qualquer reprodução, imitação ou uso sem autorização expressa e por escrito.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">8.2 Conteúdo da Plataforma</h3>
                <p>
                  Todo o conteúdo produzido pela CompreOuVenda — incluindo textos, layouts, código-fonte, interfaces, funcionalidades, documentação e materiais de marketing — é protegido por direitos autorais e não pode ser copiado, distribuído ou modificado sem autorização prévia.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">8.3 Conteúdo Gerado pelos Usuários</h3>
                <p>
                  O usuário mantém a titularidade sobre o conteúdo que publica (fotos, descrições, avaliações), mas ao publicá-lo na plataforma concede à CompreOuVenda uma <strong className="text-white">licença não exclusiva, gratuita, mundial e sublicenciável</strong> para usar, reproduzir, modificar, adaptar, publicar, traduzir e distribuir tal conteúdo nos canais da plataforma, incluindo redes sociais e materiais de marketing, pelo período em que o anúncio ou conteúdo permanecer ativo.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">8.4 Denúncias de Violação</h3>
                <p>
                  Caso você identifique conteúdo que viole seus direitos de propriedade intelectual, entre em contato com nossa equipe pelo e-mail{' '}
                  <a
                    href="mailto:contato@compreouvenda.com"
                    className="underline underline-offset-4 hover:text-white transition-colors"
                    style={{ color: '#F5921E' }}
                  >
                    contato@compreouvenda.com
                  </a>{' '}
                  indicando o conteúdo infrator, seus direitos violados e os dados que comprovem sua titularidade.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Limitação de Responsabilidade */}
          <section className="mb-10" aria-labelledby="section-responsabilidade">
            <h2
              id="section-responsabilidade"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              9. Limitação de Responsabilidade
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-4">
              <p>
                Na máxima extensão permitida pela legislação brasileira aplicável, a CompreOuVenda <strong className="text-white">não se responsabiliza</strong> por:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-gray-200">Qualidade dos produtos:</strong> a plataforma não garante a qualidade, autenticidade, segurança ou conformidade dos produtos anunciados pelos usuários com as descrições publicadas.
                </li>
                <li>
                  <strong className="text-gray-200">Transações entre usuários:</strong> negociações, pagamentos, entregas, devoluções e quaisquer conflitos decorrentes de relações diretamente estabelecidas entre compradores e vendedores são de responsabilidade exclusiva das partes envolvidas.
                </li>
                <li>
                  <strong className="text-gray-200">Disponibilidade do serviço:</strong> a CompreOuVenda não garante a disponibilidade ininterrupta da plataforma, podendo ocorrer interrupções por manutenção, atualizações, falhas técnicas ou eventos de força maior.
                </li>
                <li>
                  <strong className="text-gray-200">Danos indiretos:</strong> danos emergentes, lucros cessantes, perda de dados, interrupção de negócios ou qualquer outro dano de natureza indireta, mesmo que a CompreOuVenda tenha sido informada da possibilidade de sua ocorrência.
                </li>
                <li>
                  <strong className="text-gray-200">Atos de terceiros:</strong> condutas fraudulentas, irregulares ou danosas praticadas por outros usuários da plataforma ou por terceiros alheios à CompreOuVenda.
                </li>
              </ul>
              <p className="mt-2">
                A responsabilidade total da CompreOuVenda, quando aplicável, limitar-se-á ao valor das taxas pagas pelo usuário nos 3 (três) meses imediatamente anteriores ao evento gerador do dano.
              </p>
            </div>
          </section>

          {/* 10. Resolução de Disputas */}
          <section className="mb-10" aria-labelledby="section-disputas">
            <h2
              id="section-disputas"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              10. Resolução de Disputas
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">10.1 Mediação pela Plataforma</h3>
                <p>
                  Conflitos entre usuários poderão ser submetidos ao canal de <strong className="text-white">mediação da CompreOuVenda</strong>, disponível pelo suporte da plataforma. A equipe analisará as evidências apresentadas pelas partes e emitirá uma recomendação em até 10 (dez) dias úteis. A mediação não é vinculante, mas será registrada no histórico das partes.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">10.2 Arbitragem</h3>
                <p>
                  Caso a mediação não resolva o conflito, as partes poderão optar pela <strong className="text-white">arbitragem</strong>, conforme a Lei nº 9.307/1996 (Lei de Arbitragem), mediante acordo mútuo e celebração do compromisso arbitral. O árbitro será escolhido de comum acordo ou por câmara arbitral indicada pelas partes.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">10.3 Foro Competente</h3>
                <p>
                  Não sendo resolvida a controvérsia pelos meios acima, fica eleito o <strong className="text-white">foro da comarca de domicílio do usuário</strong> como competente para dirimir quaisquer litígios decorrentes destes Termos de Uso, ressalvadas as hipóteses de competência absoluta previstas em lei. Nas relações de consumo, aplica-se o foro mais favorável ao consumidor, conforme o Código de Defesa do Consumidor.
                </p>
              </div>
            </div>
          </section>

          {/* 11. Modificações */}
          <section className="mb-10" aria-labelledby="section-modificacoes">
            <h2
              id="section-modificacoes"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              11. Modificações dos Termos
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-3">
              <p>
                A CompreOuVenda reserva-se o direito de <strong className="text-white">alterar estes Termos de Uso a qualquer tempo</strong>, visando adequar-se a mudanças legais, novas funcionalidades da plataforma ou melhorias na relação com os usuários.
              </p>
              <p>
                Alterações significativas serão comunicadas pelos seguintes canais:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-gray-200">E-mail:</strong> notificação enviada ao endereço cadastrado pelo usuário, com antecedência mínima de 15 (quinze) dias da entrada em vigor das mudanças.
                </li>
                <li>
                  <strong className="text-gray-200">Aplicativo / Site:</strong> aviso em destaque na plataforma, exibido no acesso do usuário após a publicação das alterações.
                </li>
              </ul>
              <p>
                A <strong className="text-white">continuação do uso da plataforma após o prazo de notificação implica no aceite automático</strong> dos novos termos. Caso o usuário não concorde com as modificações, deverá encerrar sua conta antes da entrada em vigor das alterações.
              </p>
            </div>
          </section>

          {/* 12. Disposições Gerais */}
          <section className="mb-10" aria-labelledby="section-disposicoes">
            <h2
              id="section-disposicoes"
              className="text-xl md:text-2xl font-semibold mb-4"
              style={{ color: '#5B2D8E' }}
            >
              12. Disposições Gerais
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">12.1 Lei Aplicável</h3>
                <p>
                  Estes Termos de Uso são regidos e interpretados de acordo com a <strong className="text-white">legislação brasileira</strong>, incluindo, mas não se limitando ao Código Civil (Lei nº 10.406/2002), ao Código de Defesa do Consumidor (Lei nº 8.078/1990), ao Marco Civil da Internet (Lei nº 12.965/2014) e à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">12.2 Cessão</h3>
                <p>
                  O usuário <strong className="text-white">não poderá ceder, transferir ou sublicenciar</strong> seus direitos e obrigações decorrentes destes Termos sem o consentimento prévio e expresso da CompreOuVenda. A CompreOuVenda poderá ceder seus direitos a empresas do mesmo grupo econômico ou em caso de fusão, aquisição ou reorganização societária, sendo o usuário notificado previamente.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">12.3 Integralidade do Acordo</h3>
                <p>
                  Estes Termos de Uso, em conjunto com a{' '}
                  <a
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-white transition-colors"
                    style={{ color: '#F5921E' }}
                  >
                    Política de Privacidade
                  </a>{' '}
                  e demais políticas publicadas na plataforma, constituem o <strong className="text-white">acordo integral entre o usuário e a CompreOuVenda</strong>, substituindo quaisquer acordos anteriores, escritos ou verbais, sobre o mesmo objeto.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">12.4 Invalidade Parcial</h3>
                <p>
                  Se qualquer cláusula destes Termos for declarada inválida, ilegal ou inexequível por qualquer autoridade competente, as demais disposições permanecerão em pleno vigor, sem que a invalidade parcial afete o restante do acordo.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">12.5 Contato</h3>
                <p>
                  Para dúvidas, solicitações ou notificações relacionadas a estes Termos de Uso, entre em contato:
                </p>
                <div className="mt-3 space-y-1">
                  <p>
                    <strong className="text-gray-200">E-mail:</strong>{' '}
                    <a
                      href="mailto:contato@compreouvenda.com"
                      className="underline underline-offset-4 hover:text-white transition-colors"
                      style={{ color: '#F5921E' }}
                    >
                      contato@compreouvenda.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-gray-200">Empresa:</strong> CompreOuVenda LTDA
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-8 border-t border-white/10">
            <p className="text-gray-500 text-xs text-center">
              © {new Date().getFullYear()} CompreOuVenda LTDA. Todos os direitos reservados. Termos de Uso v1.0 — vigente desde 15/05/2026.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
