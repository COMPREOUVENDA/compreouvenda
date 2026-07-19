# Relatório de Auditoria — COMPREOUVENDA.COM

**Data da auditoria:** 18/07/2026  
**Repositório analisado:** `C:\Users\Thaís Azevedo\compreouvenda`  
**Framework:** Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase  
**Total de arquivos auditados:** ~237  
**Total de linhas de código:** ~36.800+

---

## Dashboard Resumido

| Métrica | Valor |
|---|---|
| **Progresso geral do projeto** | **78%** |
| Funcionalidades concluídas | 42 |
| Funcionalidades parcialmente implementadas | 18 |
| Funcionalidades não iniciadas | 7 |
| Bugs críticos | 4 |
| Bugs médios | 9 |
| Bugs leves / débitos técnicos | 14 |
| **Tempo estimado para MVP de produção** | **4–6 semanas** |
| **Tempo estimado para versão completa** | **10–14 semanas** |

### Progresso por Módulo

```
Autenticação e Usuários       ██████████████████████░░   88%
Marketplace (produtos/feed)   ████████████████████░░░░   85%
Chat e Negociação             ████████████████████░░░░   82%
Pedidos e Escrow              ███████████████████░░░░░   78%
Pagamentos                    ██████████████░░░░░░░░░░   55%
Notificações (push/realtime)  ████████████████████░░░░   80%
IA (precificação/geração)     ███████████████░░░░░░░░░   70%
Monetização/Premium/Ads       ████████████░░░░░░░░░░░░   60%
Impacto Social (Doações)      █████████████████░░░░░░░   75%
Painel Administrativo         ███████████████████░░░░░   78%
UX/UI, Acessibilidade         ████████████████░░░░░░░░   75%
Segurança e Performance       ██████████████░░░░░░░░░░   58%
Testes Automatizados          ██░░░░░░░░░░░░░░░░░░░░░░   10%
SEO/Legal/PWA/Publicação      ██████████████████░░░░░░   82%
Aplicativos Nativos           ░░░░░░░░░░░░░░░░░░░░░░░░    0%
```

---

## 1. Percentual de Conclusão por Módulo

### 1.1 Autenticação e Gerenciamento de Usuários — 88%

**Concluído:**
- Cadastro multi-step com LGPD (`src/app/(auth)/register/page.tsx:1-1232`)
- Login com email/senha (`src/app/(auth)/login/page.tsx`)
- Recuperação e reset de senha
- OAuth social (Google) com callback
- Perfil público de vendedor (`src/app/(main)/seller/[id]/page.tsx:457 linhas`)
- Perfil/configurações do usuário
- Verificação de documentos, trust score, histórico de verificação
- Bloqueio de usuários suspensos

**Parcialmente implementado:**
- **2FA:** API backend completa (`src/app/api/auth/2fa/*`), mas UI `TwoFactorSetup.tsx` aceita qualquer código de 6 dígitos sem validar TOTP.
- **Timeout no signUp:** implementado recentemente (`src/hooks/useAuth.ts:116-130`) mas ainda não testado em cenário sem rate limit.

**Bugs/Problemas:**
- Schema mismatch histórico em `user_consents` — corrigido.
- Rate limit do Supabase Free tier bloqueia cadastros repetidos.
- RLS policies de wallet/2FA/withdrawals muito permissivas.

---

### 1.2 Marketplace (Feed, Produtos, Busca) — 85%

**Concluído:**
- Feed principal com filtros, geolocalização, paginação (`src/app/(main)/page.tsx:300`)
- Busca com filtros de categoria/preço/localização (`src/app/(main)/search/page.tsx:318`)
- Página de produto completa: carrossel, oferta, leilão, doação, afiliados, favoritos, avaliações, SEO (`src/app/(main)/product/[id]/page.tsx:568`)
- Cadastro de produto com upload de imagens, IA de sugestão, vídeo, auction, doação (`src/app/(main)/product/new/page.tsx:817`)
- Edição de produto (`src/app/(main)/product/[id]/edit/page.tsx:466`)
- Favoritos (`src/app/(main)/favorites/page.tsx`, `src/hooks/useFavorites.ts`)
- Categorias

**Parcialmente implementado:**
- Upload de vídeo: UI marcada como **"Em breve"** (`src/app/(main)/product/new/page.tsx:523`)
- IA de geração de título/descrição: funciona com templates heurísticos, não usa LLM real
- Geolocalização: modo de teste ativo por padrão (`src/hooks/useGeolocation.ts:96-189`)

**Bugs/Problemas:**
- `src/app/(main)/product/[id]/edit/page.tsx:261` usava `cat.label` em vez de `cat.name` — corrigido.
- Mock products usados como fallback em vários lugares.

---

### 1.3 Chat e Negociação — 82%

**Concluído:**
- Chat em tempo real via Supabase Realtime (`src/hooks/useChat.ts:222`)
- Lista de conversas, mensagens, indicador de digitação
- Envio de ofertas, imagens, mensagens
- Toast de novas mensagens (`src/components/notifications/NewMessageToast.tsx`)
- API de mensagens (`src/app/api/messages/route.ts:107`)

**Parcialmente implementado:**
- Recibo de leitura: coluna `read_at` existe mas sem confirmação visual robusta
- Anexos de chat: tabela existe, RLS aberto demais

---

### 1.4 Pedidos e Escrow — 78%

**Concluído:**
- Fluxo de pedidos (`src/app/(main)/orders/page.tsx:219`, `src/hooks/useOrders.ts:244`)
- Detalhe do pedido com escrow (`src/app/(main)/orders/[id]/page.tsx:383`)
- Sistema de escrow completo (`src/lib/escrow.ts:740`)
- QR code para confirmação de entrega (`src/components/escrow/QRScanner.tsx:231`)
- Disputas, rastreamento de envio, auto-release via cron
- 7 rotas API de escrow

**Parcialmente implementado:**
- Integração de rastreamento com transportadoras: apenas campos de tracking, sem API externa.
- Auto-release de escrow: cron existe mas não testado end-to-end.

---

### 1.5 Pagamentos — 55%

**Concluído:**
- Integração PagBank REST para PIX e cartão (`src/lib/pagbank.ts:228`)
- Criação de pagamento, webhook, status, refund (`src/app/api/payments/*`)
- Checkout com polling de status (`src/components/payment/CheckoutForm.tsx:223`)
- Split de pagamento, taxas, comissões

**Parcialmente implementado:**
- Ambiente **sandbox** do PagBank — requer token de produção.
- Webhook configurado por pedido, mas sem URL de produção confirmada.
- Duas bibliotecas de pagamento conflitantes: `src/lib/payments.ts` e `src/lib/payments/index.ts` (a segunda ainda contém mock PIX).
- Supabase Edge Function `process-payment` é stub com TODOs.

**Não implementado:**
- Métodos de pagamento salvos (cartões/PIX keys do usuário)
- Recibos/notas fiscais
- Conciliação financeira automática

---

### 1.6 Notificações (Push + Realtime) — 80%

**Concluído:**
- Sistema de notificações realtime (`src/hooks/useNotifications.ts:276`)
- Push notifications com web-push, SW, VAPID (`src/lib/push-notifications.ts:294`, `public/sw.js:253`)
- Painel de preferências (`src/components/notifications/NotificationPreferences.tsx:158`)
- Banner de permissão, centro de notificações (`src/components/notifications/NotificationCenter.tsx:194`)
- Fila de notificações no banco (`notification_queue`)
- 3 rotas API de notificações

**Parcialmente implementado:**
- Requer chaves VAPID configuradas em produção (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- Testes de entrega de push não realizados em produção

---

### 1.7 IA — 70%

**Concluído:**
- Precificação inteligente com algoritmo interno + fallback OpenAI (`src/lib/ai-pricing.ts:317`)
- UI de sugestão de preço (`src/components/ai/PriceSuggestionCard.tsx:256`)
- Painel admin de IA pricing (`src/app/admin/ai-pricing/page.tsx:349`)
- API de pricing (`src/app/api/ai/pricing/route.ts`, `src/app/api/ai/pricing/market/route.ts`)

**Parcialmente implementado:**
- Geração de título/descrição: **não usa IA real**, apenas templates heurísticos (`src/app/api/ai/generate/route.ts:88-155`)
- Sugestão de categoria: regras fixas
- Detecção de produtos similares: algoritmo básico (`src/lib/duplicate-detection.ts:148`)

**Não implementado:**
- Geração automática de vídeo
- Estimativa precisa de tempo para venda

---

### 1.8 Monetização / Premium / Anúncios — 60%

**Concluído:**
- Planos premium (`src/app/(main)/premium/page.tsx:266`)
- Painel admin de anúncios comerciais (`src/app/admin/commercial/page.tsx:569`)
- Modal de boost de produto (`src/components/ads/BoostProductModal.tsx:210`)
- Carrossel de anúncios (`src/components/ads/AdBannerCarousel.tsx:449`)
- Tabelas de subscriptions e coupons (`014_subscriptions_coupons.sql`)

**Parcialmente implementado:**
- Cobrança recorrente de premium: sem gateway recorrente configurado
- Cobrança por boost/destaque: sem integração de pagamento ativa
- Cashback: colunas existem, sem lógica de crédito automático
- Cupons: admin existe, aplicação no checkout não validada end-to-end

---

### 1.9 Impacto Social (Doações) — 75%

**Concluído:**
- Sistema de doação no cadastro de produto
- Escolha de instituição beneficiada
- Página Solidário (`src/app/(main)/solidario/page.tsx:372`)
- Painel admin de doações
- Relatório de impacto (`src/app/impacto/page.tsx:220`)

**Parcialmente implementado:**
- Lista de instituições mostra "Instituições em breve!" em alguns estados
- Transparência automática de contribuições limitada

---

### 1.10 Painel Administrativo — 78%

**Concluído:**
- 25+ páginas admin: usuários, produtos, pedidos, escrow, pagamentos, notificações, IA, categorias, cupons, auditoria, configurações
- AdminGuard com controle de acesso (`src/app/admin/AdminGuard.tsx:100`)
- Estatísticas e dashboards
- Ações em massa, filtros, modais de detalhe

**Parcialmente implementado:**
- Algumas páginas admin usam mocks como fallback quando DB está vazio
- Vídeos admin (`src/app/admin/videos/page.tsx:75`) — superficial
- Relatórios admin (`src/app/admin/reports/page.tsx:36`) — muito básico
- Comissões e flash offers usam mocks

---

### 1.11 UX/UI, Responsividade e Acessibilidade — 75%

**Concluído:**
- Design system com Tailwind, tema claro/escuro
- Componentes reutilizáveis (StarRating, Skeleton, Toast, etc.)
- Mobile-first em grande parte
- Skip link, aria-labels em vários componentes
- PWA manifest e ícones

**Parcialmente implementado:**
- Acessibilidade: não há testes com leitor de tela
- Responsividade: algumas páginas admin e formulários longos precisam de ajustes
- Animações e microinterações básicas

---

### 1.12 Segurança, Desempenho e Escalabilidade — 58%

**Concluído:**
- `next.config.js` atualizado com headers de segurança (CSP, HSTS, X-Frame-Options)
- Rate limiting em middleware e rotas API
- RLS habilitado na maioria das tabelas
- Otimização de imagens (`OptimizedImage.tsx`)
- Indexes de performance (`013_performance_indexes.sql`)

**Pendente/Crítico:**
- RLS policies **muito permissivas** em payments, wallet, 2fa, withdrawals, chat attachments
- Duplicação da tabela `payments` (migrations 001 e 009)
- `users.type = 'admin'` usado em policy, mas enum não inclui 'admin'
- Service role key hardcoded em scripts (`scripts/_run_migrations_v2.js`)
- Falta logger estruturado (console.log em webhook/cron)
- Cache e CDN não configurados além do padrão Next.js
- Testes de segurança não realizados

---

### 1.13 Testes Automatizados — 10%

**Concluído:**
- Configuração do Playwright (`playwright.config.ts:30`)
- Um spec E2E inicial (`e2e/critical-flows.spec.ts:204`)

**Não implementado:**
- Zero testes unitários
- Zero testes de integração
- Testes E2E não executados consistentemente

---

### 1.14 SEO, Legal, PWA e Publicação — 82%

**Concluído:**
- Sitemap dinâmico (`src/app/sitemap.ts:94`)
- Robots.txt, JSON-LD
- Páginas de privacidade e termos detalhadas
- LGPD com consentimentos
- PWA manifest completo e SW funcional

**Parcialmente implementado:**
- PWA: SW só é registrado via opt-in de push, não como trigger standalone de instalação
- SEO de produtos feito, mas sem testes de rich snippets

**Não implementado:**
- Aplicativos nativos Android/iOS
- Publicação em lojas

---

## 2. Bugs, Inconsistências e Problemas de Arquitetura

### Críticos

| # | Problema | Arquivo(s) | Impacto |
|---|---|---|---|
| 1 | **Rate limit do Supabase Free** impede cadastros em teste | Supabase Auth | Bloqueia onboarding de novos usuários |
| 2 | **Duas tabelas `payments` conflitantes** | `001_initial_schema.sql`, `009_payments.sql` | Risco de corrupção de dados |
| 3 | **RLS permissivo em payments/wallet** | `009_payments.sql`, `010_p1_wallet_reviews_2fa.sql` | Vazamento financeiro |
| 4 | **PagBank em sandbox** + webhook sem produção | `src/lib/pagbank.ts`, API routes | Não é possível cobrar clientes reais |
| 5 | **Vercel project vinculado ao repo errado** | Vercel dashboard | Pushes não deployavam automaticamente (resolvido manualmente) |

### Médios

| # | Problema | Arquivo(s) | Impacto |
|---|---|---|---|
| 6 | 2FA UI não valida TOTP | `src/components/security/TwoFactorSetup.tsx` | Segurança comprometida |
| 7 | Geolocalização em modo mock por padrão | `src/hooks/useGeolocation.ts` | Feed não usa localização real |
| 8 | Geração de vídeo é placeholder | `src/lib/video/index.ts`, `VideoGenerator.tsx` | Feature anunciada não funciona |
| 9 | Geração de conteúdo por IA não usa LLM | `src/app/api/ai/generate/route.ts` | Não entrega valor de IA |
| 10 | Report button só loga no console | `src/components/ui/ReportButton.tsx:29` | Moderação inoperante |
| 11 | `users.type = 'admin'` inválido em RLS | `014_subscriptions_coupons.sql` | Admin não consegue gerenciar subscriptions |
| 12 | Mock data usada como fallback primário | vários hooks/admin pages | Dados falsos podem confundir usuários |
| 13 | Service role key hardcoded | `scripts/_run_migrations_v2.js` | Risco de vazamento |

### Leves / Débito Técnico

| # | Problema | Arquivo(s) |
|---|---|---|
| 14 | console.log em webhook/cron | `src/app/api/payments/webhook/route.ts`, crons |
| 15 | Páginas muito grandes (>500 linhas) | register, dashboard, commercial, privacy, terms |
| 16 | Componente `useAuth` acoplado a consentimentos | `src/hooks/useAuth.ts` |
| 17 | Duplicação de bibliotecas de pagamento | `src/lib/payments.ts` vs `src/lib/payments/index.ts` |
| 18 | Tipos de `database.ts` marcados como placeholder | `src/types/database.ts` |
| 19 | Supabase function `process-payment` é stub | `supabase/functions/process-payment/index.ts` |
| 20 | PWA não registra SW standalone | `public/sw.js`, layouts |

---

## 3. Pendências de Integração

| Integração | Status | O que falta |
|---|---|---|
| Supabase Auth | Funcional | Resolver rate limit / upgrade de plano |
| Supabase DB/Realtime | Funcional | Correção de RLS e schema de payments |
| Supabase Storage | Funcional | — |
| PagBank | Sandbox | Token de produção, webhook de produção, conciliação |
| Push notifications | Configurável | Chaves VAPID em produção, testes de entrega |
| Email (Resend) | Configurável | `RESEND_API_KEY` e domínio verificado |
| Analytics (GA4/Vercel) | Configurável | `NEXT_PUBLIC_GA_ID` e configuração |
| IA (OpenAI) | Configurável | `OPENAI_API_KEY`; gerar título/desc com LLM real |
| Video generation | Placeholder | Integração com Pika/Runway ou serviço real |
| 2FA TOTP | Placeholder | Validar código no frontend |
| Geolocalização | Mock | Ativar modo real e fallback |

---

## 4. Pendências de UX/UI, Responsividade e Acessibilidade

- [ ] Testar fluxo completo com leitor de tela
- [ ] Revisar contraste e foco em todos os formulários
- [ ] Melhorar responsividade do painel admin
- [ ] Adicionar estados de erro/empty mais informativos
- [ ] Reduzir tamanho das páginas de formulário
- [ ] Melhorar feedback de loading em ações críticas
- [ ] Padronizar componentes de formulário

---

## 5. Pendências de Segurança, Desempenho e Escalabilidade

- [ ] Corrigir RLS policies permissivas
- [ ] Unificar tabela `payments`
- [ ] Remover service role key hardcoded
- [ ] Implementar logger estruturado (Pino/Winston)
- [ ] Configurar CDN para imagens/vídeos
- [ ] Adicionar rate limiting por usuário autenticado
- [ ] Implementar hash/salt adequado para secrets (se houver)
- [ ] Adicionar headers de segurança adicionais
- [ ] Revisar CORS na API
- [ ] Implementar auditoria de todas as ações financeiras

---

## 6. Dependências Externas que Impedem Conclusão

| Dependência | Bloqueio | Ação necessária |
|---|---|---|
| Supabase plano Free | Rate limit de 4 emails/hora | Upgrade para Pro ou aumentar limites no dashboard |
| PagBank | Apenas sandbox | Conta PagBank aprovada + token de produção |
| Vercel project | Estava vinculado ao repo errado | Reconfigurar GitHub connection (feito parcialmente via CLI) |
| Resend | Não confirmado | Verificar `RESEND_API_KEY` e domínio |
| OpenAI | Opcional para IA real | Configurar `OPENAI_API_KEY` |
| VAPID keys | Opcional para push | Gerar e configurar chaves |
| Google Play / App Store | Não iniciado | Criar contas de desenvolvedor e builds nativos |
| Domínio próprio | Apenas .vercel.app | Comprar e configurar compreouvenda.com |

---

## 7. Plano de Ação Priorizado

### Fase 1 — Correções Críticas (1–2 semanas)

| # | Tarefa | Esforço | Dependência |
|---|---|---|---|
| 1 | Resolver rate limit do Supabase (upgrade ou bypass temporário) | Média | Acesso ao dashboard ou PAT |
| 2 | Unificar e corrigir schema da tabela `payments` | Alta | Migration SQL |
| 3 | Corrigir RLS policies críticas (payments, wallet, 2fa) | Alta | Acesso ao SQL editor |
| 4 | Configurar PagBank produção e webhook | Média | Conta PagBank |
| 5 | Testar cadastro, login e criação de produto end-to-end | Média | Rate limit resolvido |

### Fase 2 — Funcionalidades Core (2–3 semanas)

| # | Tarefa | Esforço | Dependência |
|---|---|---|---|
| 6 | Ativar geolocalização real | Baixa | — |
| 7 | Implementar 2FA TOTP real no frontend | Média | — |
| 8 | Configurar Resend e testar emails transacionais | Média | Resend API key |
| 9 | Configurar VAPID e testar push notifications | Média | Chaves VAPID |
| 10 | Implementar geração de título/desc com LLM real | Média | OpenAI API key |
| 11 | Remover mocks primários dos hooks/admin | Média | — |

### Fase 3 — Monetização (2–3 semanas)

| # | Tarefa | Esforço | Dependência |
|---|---|---|---|
| 12 | Cobrança real de premium/boost | Alta | Gateway recorrente |
| 13 | Fluxo de cupons no checkout | Média | — |
| 14 | Cashback automático | Média | — |
| 15 | Relatórios financeiros | Média | — |

### Fase 4 — Qualidade e Publicação (3–4 semanas)

| # | Tarefa | Esforço | Dependência |
|---|---|---|---|
| 16 | Escrever testes unitários e E2E | Alta | — |
| 17 | Auditoria de segurança completa | Média | — |
| 18 | Otimização de performance (cache, CDN) | Média | — |
| 19 | Acessibilidade e responsividade | Média | — |
| 20 | Build nativo Android/iOS ou PWA publicado | Alta | Conta dev /
| 21 | Publicação em lojas e SEO final | Média | Domínio próprio |

---

## 8. Cronograma Sugerido

| Semana | Foco | Entregáveis |
|---|---|---|
| 1 | Infra + segurança | Rate limit resolvido, RLS corrigido, payments unificado, cadastro testado |
| 2 | Core funcional | Geolocalização real, 2FA, emails, push, IA real |
| 3 | Monetização | Premium/boost cobrando, cupons, cashback |
| 4 | Qualidade | Testes E2E cobrindo fluxos críticos, acessibilidade, performance |
| 5 | Produção | Domínio, SEO, deploy final, monitoramento |
| 6+ | Nativo/Loja | PWA publicado ou apps Android/iOS |

---

## 9. Conclusão

O **COMPREOUVENDA.COM está em 78% de conclusão**. A arquitetura é sólida, a maior parte das funcionalidades de marketplace está implementada e o código é de boa qualidade. Os principais gargalos são:

1. **Infraestrutura/Rate limit do Supabase** — impede testes reais de onboarding
2. **Pagamentos em sandbox** — impede monetização
3. **Segurança de RLS** — risco de vazamento de dados financeiros
4. **Mocks e placeholders** — reduzem confiança em alguns módulos
5. **Testes automatizados ausentes** — aumentam risco de regressões

Com **4–6 semanas focadas** nas correções críticas e testes, o aplicativo pode estar pronto para um **MVP de produção**. A versão completa com apps nativos, monetização avançada e qualidade enterprise demanda **10–14 semanas**.
