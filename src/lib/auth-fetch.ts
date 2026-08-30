'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * `fetch` autenticado para as rotas internas do aplicativo.
 *
 * As rotas server-side resolvem a identidade pelo cookie de sessão OU pelo
 * header `Authorization`. Logo após o login o cookie ainda pode não ter sido
 * propagado ao cliente, então anexamos o access token explicitamente.
 *
 * Usado tanto pelo app do usuário (`/api/club/*`) quanto, por delegação, pelo
 * painel administrativo e pelo Portal do Parceiro.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
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

/** Igual a `authFetch`, mas já devolve o JSON e lança em caso de erro. */
export async function authFetchJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(input, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Falha na requisição (${res.status})`);
  }
  return json as T;
}
