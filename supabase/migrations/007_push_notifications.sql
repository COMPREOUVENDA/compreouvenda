-- ============================================================
-- 007_push_notifications.sql
-- Push Notification System for COMPREOUVENDA.COM
-- ============================================================

-- ── push_subscriptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  device_info jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all (for sending notifications)
CREATE POLICY "push_subscriptions_service_all"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ── notification_queue ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_queue (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  icon       text,
  image      text,
  url        text DEFAULT '/',
  type       text NOT NULL DEFAULT 'system'
             CHECK (type IN ('new_order','new_message','price_alert','product_sold','review_received','payment_received','promotion','system')),
  data       jsonb DEFAULT '{}',
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','sent','failed','read')),
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_select_own"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_queue_update_own"
  ON notification_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notification_queue_service_all"
  ON notification_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Allow insert from authenticated users (system inserts via service role)
CREATE POLICY "notification_queue_insert_service"
  ON notification_queue FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ── notification_preferences ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  new_order          boolean NOT NULL DEFAULT true,
  new_message        boolean NOT NULL DEFAULT true,
  price_alert        boolean NOT NULL DEFAULT true,
  product_sold       boolean NOT NULL DEFAULT true,
  review_received    boolean NOT NULL DEFAULT true,
  payment_received   boolean NOT NULL DEFAULT true,
  promotion          boolean NOT NULL DEFAULT true,
  system             boolean NOT NULL DEFAULT true,
  quiet_hours_start  time,
  quiet_hours_end    time,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_service_all"
  ON notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'push_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER push_subscriptions_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'notification_preferences_updated_at'
  ) THEN
    CREATE TRIGGER notification_preferences_updated_at
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
