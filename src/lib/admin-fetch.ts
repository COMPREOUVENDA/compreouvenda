'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * `fetch` para o painel administrativo.
 *
 * As rotas em `/api/admin/*` são protegidas por `requireAdmin`, que resolve a
 * identidade a partir do cookie de sessão OU do header `Authorization`. Logo
 * após o login o cookie ainda pode não estar disponível no cliente, então
 * anexamos o access token explicitamente — mesmo padrão já usado no AdminGuard.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/** Igual a `adminFetch`, mas já devolve o JSON e lança em caso de erro. */
export async function adminFetchJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(input, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Falha na requisição (${res.status})`);
  }
  return json as T;
}
