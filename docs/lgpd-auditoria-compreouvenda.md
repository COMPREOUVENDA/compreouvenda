# Auditoria Completa de Conformidade LGPD — CompreOuVenda

## Escopo e metodologia

Auditoria baseada na leitura do código-fonte do aplicativo `CompreOuVenda` na stack `Next.js 14 + Supabase`, incluindo:

- frontend em `src/app`, `src/components`, `src/hooks`
- integrações e utilitários em `src/lib`
- schema e políticas em `supabase/migrations/001_initial_schema.sql`
- service worker e PWA em `public/sw.js` e `public/manifest.json`
- fluxos administrativos em `src/app/admin/*` e `src/app/api/admin/delete-user/route.ts`

O objetivo foi:

1. identificar pontos de coleta e tratamento de dados pessoais
2. verificar aderência a bases legais e princípios da LGPD
3. apontar gaps de conformidade
4. consolidar um plano de remediação priorizado

---

## Resumo executivo

O aplicativo já possui alguns controles relevantes para LGPD:

- exclusão de conta com janela de 30 dias
- download de dados em JSON
- logs de auditoria para eventos sensíveis
- consentimento do navegador para geolocalização
- consentimento do navegador para notificações push
- validação de maioridade no cadastro de pessoa física

Apesar disso, a conformidade ainda está **parcial e insuficiente** para uma posição robusta de aderência à LGPD. Os maiores problemas encontrados são:

- ausência de páginas reais de `Política de Privacidade` e `Termos de Uso`, embora sejam exigidas no cadastro
- ausência de banner/gestão de cookies
- ausência de registro estruturado de consentimentos
- ausência de política de retenção por categoria de dado
- base legal não formalizada por finalidade de tratamento
- possível coleta excessiva de geolocalização precisa no cadastro
- risco relevante na exposição pública de dados via policy ampla da tabela `users`
- inconsistências entre schema e código em auditoria, exclusão, notificações push e campos de status

---

## Inventário de dados pessoais tratados

### 1. Cadastro e autenticação

**Arquivos principais**

- `src/app/(auth)/register/page.tsx`
- `src/hooks/useAuth.ts`
- `supabase/migrations/001_initial_schema.sql`

**Dados coletados**

- nome
- email
- telefone
- senha
- CPF ou CNPJ
- data de nascimento
- tipo de usuário
- cidade
- estado
- latitude e longitude

**Finalidade**

- criação de conta
- autenticação
- identificação do perfil comprador/vendedor/instituição
- habilitação de experiência geolocalizada
- eventual prevenção a fraude e validação operacional

**Base legal aplicável**

- execução de contrato / procedimentos preliminares
- obrigação legal ou regulatória em cenários fiscais/KYC específicos
- consentimento para geolocalização precisa, quando não estritamente necessária

**Avaliação**

- `OK`: há aceite obrigatório de termos e política no fluxo de cadastro
- `GAP`: links referenciados (`/terms` e `/privacy`) não aparecem como páginas implementadas no código
- `GAP`: geolocalização precisa é obrigatória para concluir cadastro
- `GAP`: CPF/CNPJ e data de nascimento são coletados cedo, sem matriz de necessidade documentada

---

### 2. Perfil e conta do usuário

**Arquivos principais**

- `src/app/(main)/dashboard/page.tsx`
- `src/hooks/useAuth.ts`
- `supabase/migrations/001_initial_schema.sql`

**Dados tratados**

- nome
- telefone
- cidade
- estado
- status de conta
- metadados de exclusão agendada

**Finalidade**

- manutenção do perfil
- operação da conta
- exercício de direitos do titular

**Base legal aplicável**

- execução de contrato
- cumprimento de obrigação legal
- legítimo interesse para segurança e governança

**Avaliação**

- `OK`: correção de dados pessoais já existe via tela de configurações
- `OK`: exclusão de conta com prazo de 30 dias está implementada
- `OK`: cancelamento da exclusão também existe
- `GAP`: retenção não está formalizada por categoria de dado

---

### 3. Geolocalização

**Arquivos principais**

- `src/hooks/useGeolocation.ts`
- `src/app/(auth)/register/page.tsx`

**Dados tratados**

- latitude
- longitude
- cidade
- estado
- localização salva em `localStorage`

**Finalidade**

- localizar produtos próximos
- validar proximidade geográfica
- preencher dados regionais de usuário

**Base legal aplicável**

- consentimento
- eventualmente execução de contrato para funcionalidades locais, desde que limitada ao necessário

**Avaliação**

- `OK`: há prompt explícito do navegador
- `OK`: o usuário vê mensagem explicando a necessidade da localização
- `GAP`: localização precisa é obrigatória no cadastro
- `GAP`: armazenamento local não informa prazo nem revogação
- `GAP`: reverse geocoding usa OpenStreetMap/Nominatim sem transparência pública sobre terceiro e transferência internacional

---

### 4. Mensagens, conversas e suporte

**Arquivos principais**

- `src/app/(main)/chat/page.tsx`
- schema `conversations`, `messages`, `support_tickets`, `reports`

**Dados tratados**

- conteúdo de mensagens
- identificadores de comprador e vendedor
- timestamps
- marcação de leitura
- denúncias e tickets

**Finalidade**

- comunicação entre usuários
- suporte
- moderação
- resolução de disputas

**Base legal aplicável**

- execução de contrato
- legítimo interesse para segurança, moderação e prevenção a abuso

**Avaliação**

- `OK`: tratamento é coerente com a operação do marketplace
- `GAP`: não foi encontrada política de retenção de mensagens e tickets
- `GAP`: não foi encontrada transparência formal sobre monitoramento/moderação do conteúdo

---

### 5. Pedidos e pagamentos

**Arquivos principais**

- `src/app/(main)/checkout/page.tsx`
- `supabase/migrations/001_initial_schema.sql`

**Dados tratados**

- comprador
- vendedor
- pedidos
- valores
- status de pagamento
- IDs transacionais
- CPF do titular do cartão
- número do cartão, validade, CVV e nome do titular no frontend

**Finalidade**

- processar compra
- liquidar pagamento
- cumprir obrigações fiscais e transacionais

**Base legal aplicável**

- execução de contrato
- obrigação legal/regulatória
- legítimo interesse para prevenção à fraude

**Avaliação**

- `OK`: existe modelagem de pedidos, pagamentos e splits
- `GAP`: o checkout coleta dados de cartão diretamente no app
- `GAP`: não há evidência visível, no material auditado, de tokenização imediata ou segregação PCI
- `GAP`: falta transparência pública sobre operador de pagamento e retenção dos metadados financeiros

---

### 6. Notificações e push

**Arquivos principais**

- `src/hooks/useNotifications.ts`
- `src/app/(main)/notifications/page.tsx`
- `public/sw.js`
- `src/app/layout.tsx`

**Dados tratados**

- endpoint push
- chaves push
- user agent
- conteúdo de notificação
- estado de leitura

**Finalidade**

- notificação operacional
- alertas de atividade da conta
- potencial uso promocional

**Base legal aplicável**

- execução de contrato para alertas transacionais essenciais
- consentimento para push não essencial ou promocional

**Avaliação**

- `OK`: existe pedido explícito de permissão de push
- `OK`: usuário aciona a ativação do push por interface
- `GAP`: não há registro LGPD de consentimento, versão, finalidade e revogação
- `GAP`: o service worker é registrado globalmente em `src/app/layout.tsx`
- `GAP`: não há separação clara entre push transacional e push marketing

---

### 7. Auditoria e administração

**Arquivos principais**

- `src/lib/audit.ts`
- `src/app/admin/audit-logs/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/api/admin/delete-user/route.ts`

**Dados tratados**

- email do ator
- email do alvo
- ação administrativa
- detalhes do evento
- possíveis dados de IP

**Finalidade**

- accountability
- segurança
- governança
- resposta a incidentes

**Base legal aplicável**

- legítimo interesse
- obrigação de segurança e governança

**Avaliação**

- `OK`: há preocupação explícita com trilha de auditoria
- `GAP`: o código usa `audit_logs`, mas o schema lido cria `admin_audit_logs`
- `GAP`: inconsistência reduz confiabilidade probatória dos registros
- `GAP`: há fluxos administrativos com campos e tabelas que não constam na migration analisada

---

## Verificação dos pontos solicitados

### Política de Privacidade (`/privacidade` ou `/privacy`)

**Status:** Não conforme  
**Risco:** Alto

**Evidência**

- o cadastro referencia `/privacy`
- não foi identificada página correspondente em `src/app`

**Impacto**

- falha de transparência ao titular
- aceite formal sem documento acessível

---

### Termos de Uso (`/termos`)

**Status:** Não conforme  
**Risco:** Alto

**Evidência**

- o cadastro referencia `/terms`
- não foi identificada página correspondente em `src/app`

**Impacto**

- risco contratual e de transparência

---

### Banner/consentimento de cookies

**Status:** Não conforme  
**Risco:** Alto

**Evidência**

- middleware do Supabase usa cookies em `src/lib/supabase/middleware.ts`
- não existe componente/página/banner de cookies identificado no código

**Impacto**

- ausência de transparência sobre cookies necessários e opcionais
- ausência de preferência e gestão de consentimento

---

### Consentimento explícito para notificações push

**Status:** Parcialmente conforme  
**Risco:** Médio

**Evidência**

- `Notification.requestPermission()` em `src/hooks/useNotifications.ts`
- botão de ativação em `src/app/(main)/notifications/page.tsx`

**Impacto**

- há consentimento técnico do navegador
- falta prova regulatória do consentimento em contexto LGPD

---

### Consentimento para email marketing

**Status:** Não conforme  
**Risco:** Médio

**Evidência**

- não foi localizado checkbox, preferência ou tabela específica para opt-in de marketing por email

**Impacto**

- qualquer campanha promocional por email ficaria sem base legal claramente demonstrável

---

### Base legal para cada tipo de tratamento

**Status:** Não conforme  
**Risco:** Alto

**Evidência**

- não há matriz de tratamento/base legal no código
- não há páginas legais implementadas refletindo essa matriz

**Impacto**

- baixa capacidade de comprovar adequação de cada tratamento

---

### Minimização de dados

**Status:** Parcialmente conforme  
**Risco:** Médio

**Evidência**

- cadastro exige documento, telefone e geolocalização precisa
- data de nascimento é exigida para PF

**Impacto**

- potencial coleta superior ao estritamente necessário na etapa inicial

---

### Retenção de dados

**Status:** Parcialmente conforme  
**Risco:** Médio

**Evidência**

- exclusão de conta prevê janela de 30 dias
- dashboard informa retenção de histórico transacional por obrigação fiscal
- não existe política estruturada por categoria

**Impacto**

- o app possui regra pontual, mas não política completa de ciclo de vida dos dados

---

### Criptografia de dados sensíveis

**Status:** Parcialmente conforme  
**Risco:** Alto

**Evidência**

- não há indício explícito no código auditado de criptografia por campo para `document`, `phone`, `location_lat`, `location_lng`
- checkout recebe dados completos de cartão em campos próprios

**Impacto**

- risco elevado para segurança e governança de dados financeiros e identificadores sensíveis

---

### Compartilhamento com terceiros

**Status:** Parcialmente conforme  
**Risco:** Médio

**Terceiros identificados ou inferidos**

- Supabase
- Vercel
- OpenStreetMap / Nominatim
- potencial gateway de pagamentos
- possível provedor de geração de vídeo

**GAP**

- não há inventário público de operadores
- não há transparência sobre países, finalidades e salvaguardas

---

### Direitos do titular implementados

**Status:** Parcialmente conforme  
**Risco:** Médio

**Implementado**

- acesso/portabilidade: download JSON no dashboard
- correção: edição de perfil
- exclusão: agendamento com 30 dias

**Faltante**

- canal formal para requisições
- oposição
- confirmação de tratamento
- revisão de decisões automatizadas, se houver
- evidência operacional de atendimento a prazo

---

### Registro de consentimentos

**Status:** Não conforme  
**Risco:** Alto

**Evidência**

- não foi encontrada tabela ou camada específica para consentimentos

**Impacto**

- não há como provar data, finalidade, versão do texto ou revogação

---

### Canal de comunicação com titular (DPO/Encarregado)

**Status:** Não conforme  
**Risco:** Médio

**Evidência**

- não foi encontrada página pública ou contato de encarregado

**Impacto**

- deficiência de transparência e governança

---

### Notificação de incidentes de segurança

**Status:** Não conforme  
**Risco:** Médio

**Evidência**

- não foi localizada política ou fluxo documentado no produto

**Impacto**

- baixa maturidade para resposta regulatória e comunicação ao titular

---

### Dados de menores

**Status:** Parcialmente conforme  
**Risco:** Baixo/Médio

**Evidência**

- validação de 18+ no cadastro PF

**GAP**

- não há política pública sobre menores e responsáveis
- não há fluxo explícito para exceções ou fraude etária

---

### Transferência internacional de dados

**Status:** Não conforme  
**Risco:** Médio

**Evidência**

- uso de fornecedores e endpoints externos com provável processamento internacional

**Impacto**

- ausência de transparência e salvaguardas documentadas

---

## O que está OK hoje

1. **Exclusão de conta com carência de 30 dias**
   - implementada no dashboard
   - permite reativação

2. **Portabilidade básica**
   - exportação JSON com perfil, produtos, pedidos, favoritos, reviews e mensagens

3. **Correção de dados**
   - usuário consegue atualizar nome, telefone, cidade e estado

4. **Consentimento técnico para geolocalização**
   - o navegador solicita autorização

5. **Consentimento técnico para push**
   - o navegador solicita autorização

6. **Maioridade no cadastro PF**
   - existe validação de 18+

7. **Preocupação com accountability**
   - há logs de auditoria e fluxos administrativos sensíveis

8. **Uso de RLS no Supabase**
   - várias tabelas possuem políticas habilitadas

---

## Principais gaps de conformidade

| Gap | Risco | Impacto |
|---|---|---|
| Falta de Política de Privacidade implementada | Alto | Transparência insuficiente |
| Falta de Termos de Uso implementados | Alto | Fragilidade contratual |
| Falta de banner/gestão de cookies | Alto | Consentimento e transparência insuficientes |
| Falta de registro estruturado de consentimentos | Alto | Sem prova de consentimento |
| Ausência de matriz de base legal por tratamento | Alto | Dificuldade de demonstrar conformidade |
| Geolocalização precisa obrigatória no cadastro | Médio | Potencial violação de minimização |
| Checkout coleta dados completos de cartão no app | Alto | Risco de segurança e governança |
| Política pública de retenção inexistente | Médio | Ciclo de vida de dados indefinido |
| Falta de DPO/encarregado visível | Médio | Canal do titular ausente |
| Falta de política de incidentes | Médio | Resposta regulatória incompleta |
| Transferência internacional não documentada | Médio | Transparência insuficiente |
| Inconsistências entre schema e código | Médio | Fragilidade de governança |
| RLS ampla para perfis (`view all profiles`) | Alto | Possível exposição excessiva |

---

## Achados técnicos críticos

### 1. Policy pública excessiva em `users`

Na migration há:

- `CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);`

**Risco**

- dependendo do consumo da tabela, isso pode expor email, telefone, documento e localização a usuários indevidos

**Classificação:** Alto

---

### 2. Inconsistência entre `audit_logs` e `admin_audit_logs`

**Código**

- `src/lib/audit.ts` insere em `audit_logs`
- `src/app/admin/audit-logs/page.tsx` consulta `audit_logs`

**Schema**

- `supabase/migrations/001_initial_schema.sql` cria `admin_audit_logs`

**Risco**

- trilha de auditoria pode falhar ou ficar inconsistente

**Classificação:** Médio

---

### 3. Inconsistência entre admin model e schema

**Código**

- `src/app/api/admin/delete-user/route.ts` e `src/app/admin/users/page.tsx` verificam `role` em `users`

**Schema**

- existe tabela separada `admin_users`

**Risco**

- falhas de controle de acesso e governança

**Classificação:** Alto

---

### 4. Uso de tabela `push_subscriptions` sem evidência no schema lido

**Código**

- `src/hooks/useNotifications.ts`
- `src/app/api/admin/delete-user/route.ts`

**Risco**

- governança e retenção de consentimento push ficam opacas

**Classificação:** Médio

---

### 5. Campos de status/deletion usados no código, mas não visíveis na migration inicial

Exemplos:

- `status`
- `deleted_at`
- `deletion_scheduled_at`

**Risco**

- inconsistência documental e baixa confiança de conformidade

**Classificação:** Médio

---

## Plano de remediação priorizado

### Prioridade 1 — Bloqueadores legais imediatos

1. Implementar páginas reais:
   - `src/app/privacy/page.tsx`
   - `src/app/terms/page.tsx`
2. Incluir nelas:
   - controlador
   - encarregado/DPO
   - finalidades
   - bases legais
   - categorias de dados
   - terceiros
   - retenção
   - direitos do titular
   - incidentes
   - transferências internacionais
3. Corrigir os links do cadastro para páginas existentes

**Resultado esperado**

- transparência mínima obrigatória em produção

---

### Prioridade 2 — Consentimento e preferências

1. Implementar banner e centro de preferências de cookies
2. Criar registro persistente de consentimentos com:
   - usuário
   - finalidade
   - versão do texto
   - timestamp
   - origem
   - status
   - revogação
3. Registrar:
   - aceite de termos
   - aceite de política
   - consentimento de geolocalização
   - consentimento de push
   - marketing por email

**Resultado esperado**

- prova auditável dos consentimentos

---

### Prioridade 3 — Minimização de dados

1. Tornar geolocalização precisa opcional no cadastro base
2. Mover CPF/CNPJ e data de nascimento para momentos realmente necessários:
   - verificação de vendedor
   - pagamento
   - obrigação fiscal/KYC
3. Definir claramente o mínimo obrigatório por perfil

**Resultado esperado**

- aderência melhor ao princípio da necessidade

---

### Prioridade 4 — Segurança e pagamentos

1. Revisar checkout para evitar captura direta de PAN/CVV no app
2. Usar tokenização segura do gateway
3. Definir criptografia/segregação para:
   - documento
   - telefone
   - localização precisa
4. Revisar acesso administrativo a dados sensíveis

**Resultado esperado**

- redução de risco de incidente e exposição indevida

---

### Prioridade 5 — Retenção e descarte

1. Definir matriz de retenção por categoria:
   - perfil
   - mensagens
   - pedidos
   - pagamentos
   - notificações
   - logs
   - tickets
2. Implementar rotinas de expurgo/anonimização
3. Publicar essa lógica na política de privacidade

**Resultado esperado**

- ciclo de vida de dados controlado

---

### Prioridade 6 — Governança, RLS e accountability

1. Corrigir divergências entre código e schema
2. Revisar policy pública da tabela `users`
3. Garantir separação correta entre usuário comum e admin
4. Padronizar audit logs
5. Inventariar terceiros e transferências internacionais

**Resultado esperado**

- maior capacidade de comprovar conformidade e reduzir exposição

---

## Recomendação de classificação final

### Maturidade atual de conformidade LGPD

**Classificação geral:** Parcialmente conforme, com lacunas relevantes

### Leitura executiva

- **Base operacional existente:** boa
- **Base documental/legal:** fraca
- **Base de accountability:** parcial
- **Base de segurança e minimização:** parcial

### Prioridade prática

Se o app for para produção pública, os itens abaixo deveriam ser tratados primeiro:

1. páginas de privacidade e termos
2. registro de consentimentos
3. banner de cookies
4. revisão da geolocalização obrigatória
5. revisão da exposição pública da tabela `users`
6. revisão do fluxo de pagamento

---

## Conclusão

O `CompreOuVenda` já possui alguns elementos importantes para atendimento de direitos do titular e governança básica, mas ainda **não demonstra conformidade LGPD robusta**. O principal problema não é apenas técnico: é a combinação de ausência de transparência formal, falta de prova de consentimento, falta de política de retenção, indefinição documental das bases legais e inconsistências entre schema e implementação.

Com a remediação priorizada acima, o projeto pode evoluir rapidamente de um estágio de conformidade parcial para um patamar significativamente mais sólido.