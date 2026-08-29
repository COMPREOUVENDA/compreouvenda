-- ============================================================================
-- 008 — Clube de Benefícios e Empresas Parceiras
--
-- Estende o ecossistema COMPREOUVENDA.COM com empresas parceiras, unidades,
-- benefícios, campanhas publicitárias, validações e receitas do clube.
--
-- Princípios adotados:
--  * Base de dados centralizada: o parceiro é sempre vinculado a um registro
--    existente em public.users (não há autenticação nem cadastro paralelo).
--  * Aprovação administrativa: parceiros, benefícios e campanhas nascem em
--    'pending' e só ficam visíveis no app após aprovação pelo painel.
--  * Métricas separadas de sugestões de IA (tabela partner_ai_logs isolada).
-- ============================================================================

-- ─── 1. Empresas parceiras ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  legal_name        text NOT NULL,
  trade_name        text NOT NULL,
  tax_id            text NOT NULL UNIQUE,
  category          text NOT NULL,
  description       text,
  logo_url          text,
  cover_url         text,
  email             text,
  phone             text,
  website           text,
  instagram         text,
  -- pending: aguardando análise | changes_requested: correções solicitadas
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','suspended','inactive','changes_requested')),
  plan              text NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','basic','premium','enterprise')),
  review_notes      text,
  rejection_reason  text,
  approved_at       timestamptz,
  approved_by       uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  rating_avg        numeric(3,2) NOT NULL DEFAULT 0,
  rating_count      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_status   ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_category ON public.partners(category);
CREATE INDEX IF NOT EXISTS idx_partners_owner    ON public.partners(owner_id);
CREATE INDEX IF NOT EXISTS idx_partners_created  ON public.partners(created_at DESC);

-- ─── 2. Unidades / filiais ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_units (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id     uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name           text NOT NULL,
  street         text,
  number         text,
  complement     text,
  neighborhood   text,
  city           text NOT NULL,
  state          text NOT NULL,
  zip_code       text,
  latitude       numeric(10,7),
  longitude      numeric(10,7),
  phone          text,
  opening_hours  jsonb,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_partner ON public.partner_units(partner_id);
CREATE INDEX IF NOT EXISTS idx_units_city    ON public.partner_units(city, state);
CREATE INDEX IF NOT EXISTS idx_units_active  ON public.partner_units(is_active);

-- ─── 3. Documentos do parceiro ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_documents (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id   uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  doc_type     text NOT NULL
               CHECK (doc_type IN ('cnpj_card','social_contract','id_document','address_proof','bank_proof','other')),
  file_url     text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  notes        text,
  reviewed_at  timestamptz,
  reviewed_by  uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdocs_partner ON public.partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_pdocs_status  ON public.partner_documents(status);

-- ─── 4. Equipe do parceiro (acesso ao Portal do Parceiro) ───────────────────
-- Reutiliza public.users: nenhum cadastro ou login paralelo é criado.
CREATE TABLE IF NOT EXISTS public.partner_members (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.partner_units(id) ON DELETE SET NULL,
  role        text NOT NULL DEFAULT 'operator'
              CHECK (role IN ('owner','manager','operator')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pmembers_user    ON public.partner_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pmembers_partner ON public.partner_members(partner_id);

-- ─── 5. Histórico de alterações de status ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_status_history (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id   uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  from_status  text,
  to_status    text NOT NULL,
  reason       text,
  changed_by   uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pstatus_partner ON public.partner_status_history(partner_id, created_at DESC);

-- ─── 6. Benefícios ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.benefits (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id         uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title              text NOT NULL,
  description        text,
  benefit_type       text NOT NULL DEFAULT 'percent_discount'
                     CHECK (benefit_type IN ('percent_discount','fixed_discount','cashback','gift','combo','free_shipping','other')),
  discount_percent   numeric(5,2),
  discount_value     numeric(12,2),
  min_purchase_value numeric(12,2),
  category           text,
  eligible_categories text[],
  image_url          text,
  terms              text,
  rules              text,
  starts_at          timestamptz,
  ends_at            timestamptz,
  valid_weekdays     integer[],          -- 0=domingo .. 6=sábado; null = todos
  valid_hour_start   time,
  valid_hour_end     time,
  total_quantity     integer,            -- null = ilimitado
  used_quantity      integer NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('draft','pending','approved','rejected','paused','expired')),
  requires_approval  boolean NOT NULL DEFAULT true,
  rejection_reason   text,
  approved_at        timestamptz,
  approved_by        uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benefits_partner ON public.benefits(partner_id);
CREATE INDEX IF NOT EXISTS idx_benefits_status  ON public.benefits(status);
CREATE INDEX IF NOT EXISTS idx_benefits_period  ON public.benefits(starts_at, ends_at);

-- Unidades participantes do benefício (vazio = todas as unidades do parceiro)
CREATE TABLE IF NOT EXISTS public.benefit_units (
  benefit_id  uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  unit_id     uuid NOT NULL REFERENCES public.partner_units(id) ON DELETE CASCADE,
  PRIMARY KEY (benefit_id, unit_id)
);

-- ─── 7. Campanhas e publicidade ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_campaigns (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id        uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  benefit_id        uuid REFERENCES public.benefits(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  campaign_type     text NOT NULL DEFAULT 'sponsored'
                    CHECK (campaign_type IN ('banner','sponsored','geo_ad','seasonal','highlight')),
  image_url         text,
  target_url        text,
  target_cities     text[],
  target_states     text[],
  target_categories text[],
  radius_km         integer,
  latitude          numeric(10,7),
  longitude         numeric(10,7),
  budget            numeric(12,2),
  cost_model        text DEFAULT 'fixed' CHECK (cost_model IN ('cpm','cpc','fixed')),
  amount_paid       numeric(12,2) NOT NULL DEFAULT 0,
  priority          integer NOT NULL DEFAULT 0,
  starts_at         timestamptz,
  ends_at           timestamptz,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('draft','pending','active','paused','finished','rejected')),
  rejection_reason  text,
  approved_at       timestamptz,
  approved_by       uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camp_partner ON public.partner_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_camp_status  ON public.partner_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_camp_period  ON public.partner_campaigns(starts_at, ends_at);

-- Métricas agregadas por dia (impressões/cliques só existem quando o app
-- instrumentar os eventos; a UI deve distinguir "sem dados" de "zero").
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  uuid NOT NULL REFERENCES public.partner_campaigns(id) ON DELETE CASCADE,
  metric_date  date NOT NULL,
  impressions  integer NOT NULL DEFAULT 0,
  reach        integer NOT NULL DEFAULT 0,
  clicks       integer NOT NULL DEFAULT 0,
  redemptions  integer NOT NULL DEFAULT 0,
  conversions  integer NOT NULL DEFAULT 0,
  revenue      numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_cmetrics_date ON public.campaign_metrics(metric_date DESC);

-- ─── 8. Validação / utilização de benefícios ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.benefit_redemptions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  benefit_id       uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  partner_id       uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  unit_id          uuid REFERENCES public.partner_units(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  campaign_id      uuid REFERENCES public.partner_campaigns(id) ON DELETE SET NULL,
  code             text NOT NULL UNIQUE,
  method           text NOT NULL DEFAULT 'qr_code'
                   CHECK (method IN ('qr_code','code','manual')),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','validated','expired','cancelled')),
  purchase_value   numeric(12,2),
  discount_applied numeric(12,2),
  is_new_customer  boolean NOT NULL DEFAULT false,
  validated_at     timestamptz,
  validated_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redem_benefit ON public.benefit_redemptions(benefit_id);
CREATE INDEX IF NOT EXISTS idx_redem_partner ON public.benefit_redemptions(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redem_user    ON public.benefit_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redem_status  ON public.benefit_redemptions(status);

-- ─── 9. IA aplicada a parceiros ─────────────────────────────────────────────
-- Mantida separada das métricas observadas: aqui ficam apenas SUGESTÕES.
CREATE TABLE IF NOT EXISTS public.partner_ai_logs (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id   uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  feature      text NOT NULL
               CHECK (feature IN ('campaign_copy','benefit_suggestion','segmentation','behavior_analysis','commercial_recommendation','other')),
  input_data   jsonb,
  output_data  jsonb,
  tokens_used  integer,
  accepted     boolean,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pai_partner ON public.partner_ai_logs(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pai_feature ON public.partner_ai_logs(feature);

-- ─── 10. Receitas da plataforma (Central Financeira) ────────────────────────
-- Consolida SOMENTE as fontes que ainda não possuem tabela própria.
-- Intermediação (orders.platform_fee) e assinaturas (user_subscriptions)
-- continuam sendo lidas de suas tabelas originais — sem duplicação.
CREATE TABLE IF NOT EXISTS public.revenue_entries (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source         text NOT NULL
                 CHECK (source IN ('club_membership','partner_plan','advertising','sponsored_campaign','featured_listing','ai_credits','financial_services','other')),
  partner_id     uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  campaign_id    uuid REFERENCES public.partner_campaigns(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reference_id   uuid,
  description    text,
  gross_value    numeric(12,2) NOT NULL DEFAULT 0,
  net_value      numeric(12,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('pending','confirmed','refunded','cancelled')),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rev_source   ON public.revenue_entries(source);
CREATE INDEX IF NOT EXISTS idx_rev_occurred ON public.revenue_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rev_partner  ON public.revenue_entries(partner_id);

-- ─── 11. RLS ────────────────────────────────────────────────────────────────
-- Todo acesso administrativo passa por rotas server-side com service role
-- (ver src/lib/api-auth.ts). As policies abaixo cobrem o acesso direto do
-- aplicativo: leitura pública apenas do que já foi aprovado, e escrita do
-- parceiro restrita à própria empresa via partner_members.

ALTER TABLE public.partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_redemptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ai_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_entries       ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: o usuário autenticado pertence à equipe do parceiro?
CREATE OR REPLACE FUNCTION public.is_partner_member(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_members pm
    JOIN public.users u ON u.id = pm.user_id
    WHERE pm.partner_id = p_partner_id
      AND pm.is_active = true
      AND u.auth_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS partners_public_read ON public.partners;
CREATE POLICY partners_public_read ON public.partners
  FOR SELECT USING (status = 'approved' OR public.is_partner_member(id));

DROP POLICY IF EXISTS partners_member_update ON public.partners;
CREATE POLICY partners_member_update ON public.partners
  FOR UPDATE USING (public.is_partner_member(id));

DROP POLICY IF EXISTS units_public_read ON public.partner_units;
CREATE POLICY units_public_read ON public.partner_units
  FOR SELECT USING (
    public.is_partner_member(partner_id)
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.status = 'approved')
  );

DROP POLICY IF EXISTS units_member_write ON public.partner_units;
CREATE POLICY units_member_write ON public.partner_units
  FOR ALL USING (public.is_partner_member(partner_id))
  WITH CHECK (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS pdocs_member_all ON public.partner_documents;
CREATE POLICY pdocs_member_all ON public.partner_documents
  FOR ALL USING (public.is_partner_member(partner_id))
  WITH CHECK (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS pmembers_read ON public.partner_members;
CREATE POLICY pmembers_read ON public.partner_members
  FOR SELECT USING (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS pstatus_member_read ON public.partner_status_history;
CREATE POLICY pstatus_member_read ON public.partner_status_history
  FOR SELECT USING (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS benefits_public_read ON public.benefits;
CREATE POLICY benefits_public_read ON public.benefits
  FOR SELECT USING (
    public.is_partner_member(partner_id)
    OR (status = 'approved'
        AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.status = 'approved'))
  );

DROP POLICY IF EXISTS benefits_member_write ON public.benefits;
CREATE POLICY benefits_member_write ON public.benefits
  FOR ALL USING (public.is_partner_member(partner_id))
  WITH CHECK (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS bunits_member_all ON public.benefit_units;
CREATE POLICY bunits_member_all ON public.benefit_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_id AND public.is_partner_member(b.partner_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_id AND public.is_partner_member(b.partner_id))
  );

DROP POLICY IF EXISTS camp_public_read ON public.partner_campaigns;
CREATE POLICY camp_public_read ON public.partner_campaigns
  FOR SELECT USING (public.is_partner_member(partner_id) OR status = 'active');

DROP POLICY IF EXISTS camp_member_write ON public.partner_campaigns;
CREATE POLICY camp_member_write ON public.partner_campaigns
  FOR ALL USING (public.is_partner_member(partner_id))
  WITH CHECK (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS cmetrics_member_read ON public.campaign_metrics;
CREATE POLICY cmetrics_member_read ON public.campaign_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.partner_campaigns c WHERE c.id = campaign_id AND public.is_partner_member(c.partner_id))
  );

-- Resgates: o usuário vê os próprios; a equipe do parceiro vê os da empresa.
DROP POLICY IF EXISTS redem_read ON public.benefit_redemptions;
CREATE POLICY redem_read ON public.benefit_redemptions
  FOR SELECT USING (
    public.is_partner_member(partner_id)
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS redem_user_insert ON public.benefit_redemptions;
CREATE POLICY redem_user_insert ON public.benefit_redemptions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS redem_member_update ON public.benefit_redemptions;
CREATE POLICY redem_member_update ON public.benefit_redemptions
  FOR UPDATE USING (public.is_partner_member(partner_id));

DROP POLICY IF EXISTS pai_member_all ON public.partner_ai_logs;
CREATE POLICY pai_member_all ON public.partner_ai_logs
  FOR ALL USING (public.is_partner_member(partner_id))
  WITH CHECK (public.is_partner_member(partner_id));

-- Receitas: dado financeiro da plataforma, sem leitura pública.
-- Acesso exclusivo por service role nas rotas administrativas.

-- ─── 12. Contador de utilizações do benefício ───────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_benefit_usage()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validated' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'validated') THEN
    UPDATE public.benefits
       SET used_quantity = used_quantity + 1,
           updated_at    = now()
     WHERE id = NEW.benefit_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_benefit_usage ON public.benefit_redemptions;
CREATE TRIGGER trg_bump_benefit_usage
  AFTER INSERT OR UPDATE OF status ON public.benefit_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.bump_benefit_usage();

-- ─── 13. Registro automático de mudança de status do parceiro ───────────────
CREATE OR REPLACE FUNCTION public.log_partner_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.partner_status_history (partner_id, from_status, to_status, reason, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status,
            COALESCE(NEW.rejection_reason, NEW.review_notes), NEW.approved_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_partner_status ON public.partners;
CREATE TRIGGER trg_log_partner_status
  AFTER UPDATE OF status ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_status_change();
