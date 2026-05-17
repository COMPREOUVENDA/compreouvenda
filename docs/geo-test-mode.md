# Geo Test Mode — Guia de Uso e Reativação

## O que foi desabilitado

O **Modo Teste de Geolocalização** permite usar o app COMPREOUVENDA.COM sem GPS nem conexão
com a API de geocodificação (Nominatim/OpenStreetMap). Ele foi implementado para facilitar
o desenvolvimento e testes locais sem necessidade de browser com GPS ativo ou conexão de internet.

### Componentes afetados

| Arquivo | O que mudou |
|---|---|
| `src/components/geo/GeoProvider.tsx` | Adicionada verificação de flag; se ativo, pula o `<GeoGate>` e libera o app diretamente. O código original permanece intacto. |
| `src/hooks/useGeolocation.ts` | Adicionado mock de localização (`cidade: São Paulo, estado: SP, status: granted`) quando modo teste está ativo. `navigator.geolocation` não é chamado. |
| `src/app/admin/settings/page.tsx` | Adicionado toggle **"Geolocalização Obrigatória"** no painel admin. Persiste no `localStorage`. |
| `src/components/layout/Header.tsx` | Adicionado badge **"Modo Offline"** (faixa âmbar) quando `navigator.onLine === false`. |
| `src/hooks/useOnlineStatus.ts` | Novo hook que detecta `navigator.online/offline` e provê helpers de cache offline. |

---

## Como ativar o Modo Teste

O Modo Teste é ativado por **qualquer uma** das condições abaixo (da mais prioritária para a menos):

### 1. Variável de ambiente (recomendado para desenvolvimento)

No arquivo `.env.local` (ou `.env`), defina:

```env
# Modo Teste ativo (default quando não definido)
NEXT_PUBLIC_GEO_REQUIRED=false

# Para reativar (produção)
NEXT_PUBLIC_GEO_REQUIRED=true
```

> **Default:** quando `NEXT_PUBLIC_GEO_REQUIRED` não está definido, o modo teste fica **ativo**.
> Isso garante que desenvolvedores novos não sejam bloqueados pelo GeoGate.

### 2. Toggle no painel admin

1. Acesse `/admin/settings`
2. Localize a seção **"Geolocalização"**
3. Clique no toggle **"Geolocalização Obrigatória"**
4. A mudança é imediata — não precisa recarregar a página

O toggle persiste no `localStorage` da chave `geo_required` (`"true"` ou `"false"`).

### 3. localStorage manual (para testes pontuais)

Abra o DevTools do browser e execute:

```js
// Ativar modo teste
localStorage.setItem('geo_test_mode', 'true');
localStorage.setItem('geo_required', 'false');

// Desativar (volta ao modo normal)
localStorage.removeItem('geo_test_mode');
localStorage.setItem('geo_required', 'true');
```

---

## Como reativar a geolocalização obrigatória

Para voltar ao comportamento original (GeoGate obrigatório para todos os usuários):

### Via variável de ambiente (recomendado para produção)

```env
NEXT_PUBLIC_GEO_REQUIRED=true
```

Faça um novo deploy. A variável de ambiente tem precedência máxima.

### Via painel admin

Acesse `/admin/settings` → seção **"Geolocalização"** → ative o toggle.

### Via localStorage

```js
localStorage.setItem('geo_required', 'true');
localStorage.removeItem('geo_test_mode');
```

---

## Mock de localização

Quando o modo teste está ativo, o hook `useGeolocation` retorna:

```ts
{
  status: 'granted',
  city: 'São Paulo',
  state: 'SP',
  granted: true,
  locationLabel: 'São Paulo, SP',
  loading: false,
  error: null,
}
```

`navigator.geolocation.getCurrentPosition` **não** é chamado.
A API Nominatim/OpenStreetMap **não** é consultada.

---

## Modo Offline

O app detecta automaticamente `navigator.onLine`. Quando offline:

- **Badge** âmbar aparece no topo do header: _"Modo Offline — exibindo dados do cache"_
- **Produtos**: dados lidos do `localStorage` (chave `compreouvenda_offline_products`)
- **Perfil**: dados lidos do `localStorage` (chave `compreouvenda_offline_profile`)
- **Chat**: último estado lido do `localStorage` (chave `compreouvenda_offline_chat`)

Funções auxiliares em `src/hooks/useOnlineStatus.ts`:
- `getOfflineProducts()` / `saveProductsToOfflineCache()`
- `getOfflineProfile()` / `saveProfileToOfflineCache()`
- `getOfflineChatState()` / `saveChatStateToOfflineCache()`

---

## Módulos que dependem de internet

Os módulos abaixo **não funcionam offline** e requerem conexão ativa com a internet:

### Supabase (banco de dados, auth, realtime, storage)
- **Auth**: login, registro, sessão, refresh de token
- **Banco de dados**: leitura/escrita de produtos, usuários, pedidos, mensagens
- **Realtime**: chat em tempo real, notificações push via Supabase Realtime
- **Storage**: upload/download de imagens e vídeos de produtos
- **URL**: `https://auxaajrjwbdsnxtvgmsb.supabase.co`

### Nominatim / OpenStreetMap (geocodificação reversa)
- Converte coordenadas GPS → cidade + estado
- Necessário quando geolocalização real está ativa
- **URL**: `https://nominatim.openstreetmap.org/reverse`
- No modo teste, esta chamada é **ignorada** (usa mock)

### Gateway de pagamento — MercadoPago
- Criação de preferências de pagamento
- Webhooks de confirmação (PIX, cartão)
- **Arquivo**: `src/lib/payments/index.ts`

### Push Notifications (Service Worker)
- Registro do service worker: `navigator.serviceWorker.register('/sw.js')`
- Notificações push via browser
- **Arquivo**: `public/sw.js`

### QR Code API
- Geração de QR Codes para links de produtos e escrow
- **URL**: `https://api.qrserver.com/v1/create-qr-code/`
- **Arquivo**: `src/lib/qrcode.ts`

### Vercel Analytics
- Rastreamento de page views e eventos
- Falha silenciosamente quando offline

---

## Preservação do código original

> **Importante:** Nenhum código de geolocalização foi removido.

A implementação usa um padrão `if/else` condicional:

```ts
// Em useGeolocation.ts — exemplo simplificado
if (isGeoTestModeActive()) {
  // Retornar mock — navigator.geolocation NÃO é chamado
  return mockState;
}

// Código original permanece intacto abaixo
navigator.geolocation.getCurrentPosition(...);
```

Para reativar completamente o comportamento original, basta definir
`NEXT_PUBLIC_GEO_REQUIRED=true` — sem nenhuma alteração de código.

---

## Checklist de Deploy (produção)

- [ ] Definir `NEXT_PUBLIC_GEO_REQUIRED=true` nas variáveis de ambiente da Vercel
- [ ] Verificar que o toggle admin está ativo em `/admin/settings`
- [ ] Confirmar que `localStorage.geo_test_mode` não está definido nos browsers de produção
- [ ] Testar GeoGate em browser sem permissão de GPS para confirmar bloqueio
