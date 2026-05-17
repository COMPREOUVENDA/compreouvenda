-- COMPREOUVENDA.COM - User Validation & Security System
-- Migration: 004 - User Validation, KYC, Trust Score, Moderation

-- ============================================
-- ADD COLUMNS TO USERS TABLE
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS document_front_url TEXT,
  ADD COLUMN IF NOT EXISTS document_back_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.admin_users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device_info JSONB,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_ip TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'verified', 'suspended', 'blocked', 'pending_deletion')),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

-- Index for verification queries
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);

-- ============================================
-- USER VERIFICATION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_verification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES public.admin_users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uvh_user ON public.user_verification_history(user_id, changed_at DESC);

-- ============================================
-- USER REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports(reported_user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);

-- ============================================
-- USER DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('rg_front', 'rg_back', 'cnh_front', 'cnh_back', 'cpf', 'cnpj', 'selfie', 'proof_of_address', 'other')),
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_docs_user ON public.user_documents(user_id, status);

-- ============================================
-- DUPLICATE DETECTION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.duplicate_detection_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL
    CHECK (match_type IN ('cpf', 'cnpj', 'email_similar', 'phone', 'ip_address')),
  match_value TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dup_log_user ON public.duplicate_detection_log(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_detection_log ENABLE ROW LEVEL SECURITY;

-- user_verification_history: admins full access, users read own
CREATE POLICY "Users can view own verification history"
  ON public.user_verification_history FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- user_reports: users can create and view own reports
CREATE POLICY "Users can create reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (reporter_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own reports"
  ON public.user_reports FOR SELECT
  USING (
    reporter_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
    reported_user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- user_documents: users can upload and view own documents
CREATE POLICY "Users can upload own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own documents"
  ON public.user_documents FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- duplicate_detection_log: read-only for the user themselves
CREATE POLICY "Users can view own duplicates"
  ON public.duplicate_detection_log FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
