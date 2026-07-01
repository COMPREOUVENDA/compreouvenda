'use client';

/**
 * AuthInitializer — componente invisível que inicializa o estado de autenticação.
 *
 * Deve ser renderizado UMA VEZ no root layout para que o authStore (Zustand)
 * seja hidratado com a sessão Supabase em TODAS as rotas, não apenas no login.
 *
 * Problema que resolve: useAuth() cria o listener onAuthStateChange do Supabase.
 * Sem este componente, o user permanecia null em rotas que não chamavam useAuth(),
 * causando Header/BottomNav/SellButton a exibirem estado não-autenticado para
 * usuários logados.
 */

import { useAuth } from '@/hooks/useAuth';

export default function AuthInitializer() {
  // Apenas inicializa o listener — não renderiza nada
  useAuth();
  return null;
}
