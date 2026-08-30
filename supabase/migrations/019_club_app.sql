-- ============================================================================
-- 019 — Clube de Benefícios no aplicativo do usuário final
-- ----------------------------------------------------------------------------
-- A migration 008 criou toda a estrutura do clube do lado da operação (admin e
-- Portal do Parceiro). Faltava a ponta do consumidor: quem vê a vitrine, gera o
-- código e o apresenta no balcão.
--
-- Esta migration adiciona apenas o que a experiência do usuário exige, sem
-- duplicar nada do que já existe.
-- ============================================================================

-- ─── 1. Público-alvo do benefício ───────────────────────────────────────────
-- Nasce aberto a todos ('all'). A alavanca de monetização ('premium') fica
-- pronta para ser acionada por benefício, sem exigir nova migration depois.
ALTER TABLE public.benefits
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'benefits_audience_check'
  ) THEN
    ALTER TABLE public.benefits
      ADD CONSTRAINT benefits_audience_check CHECK (audience IN ('all', 'premium'));
  END IF;
END $$;

-- Quantas vezes a MESMA pessoa pode utilizar o benefício. null = sem limite.
-- Diferente de `total_quantity`, que é o estoque global da oferta.
ALTER TABLE public.benefits
  ADD COLUMN IF NOT EXISTS per_user_limit integer;

-- ─── 2. Índice da vitrine ───────────────────────────────────────────────────
-- A consulta pública sempre filtra por status aprovado + janela de vigência.
CREATE INDEX IF NOT EXISTS idx_benefits_showcase
  ON public.benefits (starts_at, ends_at)
  WHERE status = 'approved';

-- ─── 3. Trava antifraude no banco ───────────────────────────────────────────
-- Impede que duas requisições simultâneas gerem dois códigos pendentes do
-- mesmo benefício para a mesma pessoa. A rota já valida isso, mas validação em
-- aplicação não sobrevive a corrida — a garantia precisa estar no banco.
CREATE UNIQUE INDEX IF NOT EXISTS idx_redem_one_pending
  ON public.benefit_redemptions (benefit_id, user_id)
  WHERE status = 'pending' AND user_id IS NOT NULL;

-- Consulta "meus códigos": ordena por data dentro do usuário.
CREATE INDEX IF NOT EXISTS idx_redem_user_recent
  ON public.benefit_redemptions (user_id, created_at DESC);

-- ─── 4. Segmentação de campanhas por cidade ─────────────────────────────────
-- O banner da vitrine filtra campanhas ativas por cidade/estado do usuário.
CREATE INDEX IF NOT EXISTS idx_camp_active_period
  ON public.partner_campaigns (starts_at, ends_at)
  WHERE status = 'active';
