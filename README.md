# COMPREOUVENDA.COM 🛒

Marketplace moderno com vídeos gerados por IA, geolocalização, comissões e doações beneficentes.

## Começando

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase

### Instalação

```bash
cd compreouvenda
npm install
```

### Configuração

1. Copie o arquivo de variáveis de ambiente:
```bash
cp .env.local.example .env.local
```

2. Configure suas credenciais do Supabase em `.env.local`

3. Execute as migrations no Supabase:
   - Acesse o SQL Editor no Supabase Dashboard
   - Execute o arquivo `supabase/migrations/001_initial_schema.sql`

### Rodando

```bash
npm run dev
```

Acesse: http://localhost:3000

### Painel Admin

Acesse: http://localhost:3000/admin

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **State**: Zustand
- **Icons**: Lucide React

## Estrutura

```
src/
├── app/
│   ├── (auth)/        # Login, Registro
│   ├── (main)/        # Feed, Produto, Chat, Dashboard, Favoritos
│   └── admin/         # Painel Administrativo (independente)
├── components/        # Componentes reutilizáveis
├── hooks/             # Custom hooks
├── lib/               # Utilitários e config Supabase
├── stores/            # Zustand stores
└── types/             # TypeScript types
```
