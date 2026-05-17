'use client';

// DESATIVADO ATE SEGUNDA ORDEM - Reativar quando necessario

import { useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import GeoGate from '@/components/geo/GeoGate';

// ─── Helpers: verificação do modo de teste ────────────────────────────────────

/**
 * Retorna true se o GeoGate deve ser pulado:
 * 1. Variável de ambiente NEXT_PUBLIC_GEO_REQUIRED=false (default: false = geo desabilitada para testes)
 * 2. localStorage: geo_test_mode=true
 * 3. localStorage: geo_required=false (toggle do painel admin)
 *
 * NOTA: o código original de geolocalização é 100% preservado.
 * Esta função apenas adiciona a camada de bypass.
 */
// function isGeoTestModeActive(): boolean {
//   // 1. Variável de ambiente: se NEXT_PUBLIC_GEO_REQUIRED não for explicitamente 'true', pula o gate
//   const envRequired = process.env.NEXT_PUBLIC_GEO_REQUIRED;
//   if (envRequired === 'false') return true;
//   // Default é false (desabilitado para testes) quando a variável não está definida
//   if (!envRequired || envRequired === undefined) return true;
//
//   if (typeof window === 'undefined') return false;
//
//   // 2. Flag de modo de teste no localStorage
//   try {
//     if (localStorage.getItem('geo_test_mode') === 'true') return true;
//     // 3. Toggle do painel admin
//     if (localStorage.getItem('geo_required') === 'false') return true;
//   } catch {
//     // ignore
//   }
//
//   return false;
// }

/**
 * GeoProvider — DESATIVADO ATE SEGUNDA ORDEM
 *
 * O componente abaixo foi temporariamente desativado para não bloquear
 * o acesso à plataforma. Sempre renderiza apenas {children}.
 *
 * Código original comentado abaixo para reativação quando necessário.
 *
 * Para reativar: descomentar o corpo original e remover o return <>{children}</> imediato.
 */
export default function GeoProvider({ children }: { children: React.ReactNode }) {
  // DESATIVADO ATE SEGUNDA ORDEM - Reativar quando necessario
  return <>{children}</>;

  // ── Código original preservado abaixo (não deletado) ──────────────────────

  // eslint-disable-next-line no-unreachable
  // const { status, requestLocation } = useGeolocation();
  //
  // // On first mount, silently check the Permissions API (non-blocking).
  // // If the user already granted before, the status in localStorage will be
  // // 'granted' and we skip the overlay entirely.
  // useEffect(() => {
  //   if (status === 'granted') return;
  //   if (typeof window === 'undefined') return;
  //
  //   // Se modo de teste ativo, não solicitar permissão automaticamente
  //   if (isGeoTestModeActive()) return;
  //
  //   // Check native Permissions API (Chrome/Firefox) — won't prompt the user
  //   if (navigator.permissions) {
  //     navigator.permissions
  //       .query({ name: 'geolocation' })
  //       .then((result) => {
  //         if (result.state === 'granted') {
  //           // Permission was already granted system-wide — silently obtain location
  //           requestLocation();
  //         }
  //       })
  //       .catch(() => {
  //         // Permissions API not supported — ignore
  //       });
  //   }
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  //
  // // ── Modo Teste / GeoGate desabilitado ──────────────────────────────────────
  // // Se a variável de ambiente ou flag admin indicar que geo não é obrigatória,
  // // renderiza o conteúdo diretamente sem o GeoGate.
  // // O código original abaixo permanece preservado para reativação.
  // if (isGeoTestModeActive()) {
  //   return <>{children}</>;
  // }
  //
  // // ── Comportamento original (geo obrigatória) ───────────────────────────────
  // return (
  //   <>
  //     {/* Blocking overlay — hidden only when status === 'granted' */}
  //     {status !== 'granted' && <GeoGate />}
  //
  //     {/* App content — still rendered in DOM for hydration, but visually
  //         blocked by the fixed overlay above */}
  //     {children}
  //   </>
  // );
}
