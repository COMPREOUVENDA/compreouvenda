'use client';

import { authFetch, authFetchJson } from '@/lib/auth-fetch';

/**
 * `fetch` para o painel administrativo.
 *
 * As rotas em `/api/admin/*` são protegidas por `requireAdmin`, que resolve a
 * identidade a partir do cookie de sessão OU do header `Authorization`. Logo
 * após o login o cookie ainda pode não estar disponível no cliente, então
 * anexamos o access token explicitamente — mesmo padrão já usado no AdminGuard.
 *
 * A implementação vive em `@/lib/auth-fetch`, compartilhada com o app do
 * usuário e com o Portal do Parceiro. Estes nomes são mantidos porque já são
 * usados em todo o painel.
 */
export const adminFetch = authFetch;

/** Igual a `adminFetch`, mas já devolve o JSON e lança em caso de erro. */
export const adminFetchJson = authFetchJson;
