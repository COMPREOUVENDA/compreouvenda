import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function cleanEnv(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/^\uFEFF/, '').trim();
}

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      // O Next 14 guarda respostas de `fetch` do servidor em Data Cache. Como o
      // supabase-js fala com o banco por `fetch`, sem isto uma consulta pode
      // devolver o estado de uma requisição anterior — inclusive a identidade
      // de outra sessão em chamadas de autenticação.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookies in Server Components
          }
        },
      },
    }
  );
}

