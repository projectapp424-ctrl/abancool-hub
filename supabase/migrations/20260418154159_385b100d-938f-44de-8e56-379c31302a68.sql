-- ============================================================
-- Phase 4: Admin panel + provisioning + SMS backbone
-- ============================================================

-- 1. Auto-promote super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, company, country)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'country'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  INSERT INTO public.wallet_balances (user_id, balance, currency) VALUES (NEW.id, 0, 'KES');

  -- Auto-promote the first/known super admin
  IF lower(NEW.email) = 'admin@abancool.co.ke' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- Make sure the trigger exists (it should from Phase 2, but be idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Admin audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid NOT NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    uuid,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx  ON public.admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log (target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit: staff read"  ON public.admin_audit_log FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "audit: staff write" ON public.admin_audit_log FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text, _target_type text, _target_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ============================================================
-- 3. Provisioning jobs
-- ============================================================
DO $$ BEGIN
  CREATE TYPE provisioning_status AS ENUM ('queued','running','succeeded','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.provisioning_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  service_id   uuid,
  invoice_id   uuid,
  provider     text NOT NULL,                 -- 'directadmin' | 'resellerclub' | 'sms_credits' | 'manual'
  status       provisioning_status NOT NULL DEFAULT 'queued',
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts     int  NOT NULL DEFAULT 0,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS provisioning_user_idx    ON public.provisioning_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS provisioning_status_idx  ON public.provisioning_jobs (status, created_at);

ALTER TABLE public.provisioning_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prov: own select"   ON public.provisioning_jobs FOR SELECT
  USING (auth.uid() = user_id OR is_staff(auth.uid()));
CREATE POLICY "prov: staff manage" ON public.provisioning_jobs FOR ALL
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE TRIGGER provisioning_jobs_updated_at
  BEFORE UPDATE ON public.provisioning_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enqueue_provisioning_job(
  _service_id uuid, _provider text, _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_user uuid; v_invoice uuid;
BEGIN
  SELECT user_id, (metadata->>'invoice_id')::uuid INTO v_user, v_invoice
  FROM services WHERE id = _service_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Service not found'; END IF;

  INSERT INTO provisioning_jobs (user_id, service_id, invoice_id, provider, payload)
  VALUES (v_user, _service_id, v_invoice, _provider, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Auto-enqueue jobs when invoice transitions to paid
CREATE OR REPLACE FUNCTION public.enqueue_jobs_on_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_svc record;
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status, '') <> 'paid' THEN
    FOR v_svc IN
      SELECT id, type FROM services
      WHERE user_id = NEW.user_id
        AND (metadata->>'invoice_id')::uuid = NEW.id
    LOOP
      IF v_svc.type IN ('hosting','reseller_hosting','vps') THEN
        INSERT INTO provisioning_jobs (user_id, service_id, invoice_id, provider, payload)
        VALUES (NEW.user_id, v_svc.id, NEW.id, 'directadmin', jsonb_build_object('service_type', v_svc.type));
      ELSIF v_svc.type = 'domain' THEN
        INSERT INTO provisioning_jobs (user_id, service_id, invoice_id, provider, payload)
        VALUES (NEW.user_id, v_svc.id, NEW.id, 'resellerclub', '{}'::jsonb);
      ELSIF v_svc.type = 'sms' THEN
        INSERT INTO provisioning_jobs (user_id, service_id, invoice_id, provider, payload)
        VALUES (NEW.user_id, v_svc.id, NEW.id, 'sms_credits', '{}'::jsonb);
      ELSE
        INSERT INTO provisioning_jobs (user_id, service_id, invoice_id, provider, payload)
        VALUES (NEW.user_id, v_svc.id, NEW.id, 'manual', '{}'::jsonb);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_invoice_paid_enqueue ON public.invoices;
CREATE TRIGGER on_invoice_paid_enqueue
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_jobs_on_invoice_paid();

-- ============================================================
-- 4. SMS tables
-- ============================================================
DO $$ BEGIN
  CREATE TYPE sms_status AS ENUM ('queued','sent','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sms_credits (
  user_id     uuid PRIMARY KEY,
  balance     int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_credits: own select"   ON public.sms_credits FOR SELECT
  USING (auth.uid() = user_id OR is_staff(auth.uid()));
CREATE POLICY "sms_credits: staff manage" ON public.sms_credits FOR ALL
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.sms_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  recipient    text NOT NULL,
  message      text NOT NULL,
  status       sms_status NOT NULL DEFAULT 'queued',
  provider     text NOT NULL DEFAULT 'africastalking',
  provider_message_id text,
  cost_credits int NOT NULL DEFAULT 1,
  error_message text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz
);
CREATE INDEX IF NOT EXISTS sms_messages_user_idx ON public.sms_messages (user_id, created_at DESC);
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_msg: own select" ON public.sms_messages FOR SELECT
  USING (auth.uid() = user_id OR is_staff(auth.uid()));
CREATE POLICY "sms_msg: own insert" ON public.sms_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sms_msg: staff update" ON public.sms_messages FOR UPDATE
  USING (is_staff(auth.uid()));

-- ============================================================
-- 5. Admin RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  _user_id uuid, _amount numeric, _description text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;

  UPDATE wallet_balances
  SET balance = balance + _amount, updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, currency, description)
  VALUES (_user_id,
          CASE WHEN _amount > 0 THEN 'adjustment' ELSE 'adjustment' END,
          _amount, 'KES',
          COALESCE(_description, 'Admin adjustment'));

  PERFORM log_admin_action('wallet_adjust', 'user', _user_id,
    jsonb_build_object('amount', _amount, 'description', _description));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_refund_invoice(
  _invoice_id uuid, _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_invoice invoices;
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_invoice FROM invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status <> 'paid' THEN RAISE EXCEPTION 'Invoice is not paid'; END IF;

  UPDATE wallet_balances
  SET balance = balance + v_invoice.total, updated_at = now()
  WHERE user_id = v_invoice.user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, currency, description, invoice_id)
  VALUES (v_invoice.user_id, 'refund', v_invoice.total, v_invoice.currency,
          'Refund for invoice ' || v_invoice.invoice_number ||
          COALESCE(' — ' || _reason, ''), _invoice_id);

  UPDATE invoices SET status = 'refunded', updated_at = now() WHERE id = _invoice_id;

  PERFORM log_admin_action('invoice_refund', 'invoice', _invoice_id,
    jsonb_build_object('amount', v_invoice.total, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'refunded_to_wallet', v_invoice.total);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(
  _user_id uuid, _role app_role
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can change roles';
  END IF;

  -- Upsert: replace any existing roles for this user with the new one
  DELETE FROM user_roles WHERE user_id = _user_id;
  INSERT INTO user_roles (user_id, role) VALUES (_user_id, _role);

  PERFORM log_admin_action('role_change', 'user', _user_id,
    jsonb_build_object('new_role', _role));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_grant_sms_credits(
  _user_id uuid, _credits int, _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  INSERT INTO sms_credits (user_id, balance) VALUES (_user_id, _credits)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = sms_credits.balance + EXCLUDED.balance, updated_at = now();

  PERFORM log_admin_action('sms_credits_grant', 'user', _user_id,
    jsonb_build_object('credits', _credits, 'reason', _reason));
END; $$;

-- Auto-grant SMS credits when an SMS plan is paid for
CREATE OR REPLACE FUNCTION public.fulfill_sms_credits_on_paid()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_credits int;
BEGIN
  IF NEW.status = 'succeeded' AND COALESCE(OLD.status::text, '') <> 'succeeded'
     AND NEW.provider = 'sms_credits' THEN
    -- Default: 1 credit per KES, override via payload
    v_credits := COALESCE((NEW.payload->>'credits')::int, 1000);
    INSERT INTO sms_credits (user_id, balance) VALUES (NEW.user_id, v_credits)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = sms_credits.balance + EXCLUDED.balance, updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_sms_provisioning_done ON public.provisioning_jobs;
CREATE TRIGGER on_sms_provisioning_done
  AFTER UPDATE ON public.provisioning_jobs
  FOR EACH ROW EXECUTE FUNCTION public.fulfill_sms_credits_on_paid();
