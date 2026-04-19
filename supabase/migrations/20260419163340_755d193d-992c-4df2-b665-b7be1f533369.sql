-- Drop tables now managed by WHMCS (CASCADE removes dependent FKs/policies)
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.payment_attempts CASCADE;
DROP TABLE IF EXISTS public.provisioning_jobs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;

-- Drop helper functions tied to dropped tables
DROP FUNCTION IF EXISTS public.create_invoice_from_cart() CASCADE;
DROP FUNCTION IF EXISTS public.pay_invoice_with_wallet(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_refund_invoice(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_provisioning_job(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_jobs_on_invoice_paid() CASCADE;
DROP FUNCTION IF EXISTS public.fulfill_sms_credits_on_paid() CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(text, text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.set_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_ticket_number() CASCADE;
DROP SEQUENCE IF EXISTS public.invoice_number_seq CASCADE;
DROP SEQUENCE IF EXISTS public.ticket_number_seq CASCADE;

-- Drop enums tied only to dropped tables
DROP TYPE IF EXISTS public.invoice_status CASCADE;
DROP TYPE IF EXISTS public.payment_attempt_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.provisioning_status CASCADE;
DROP TYPE IF EXISTS public.service_status CASCADE;
DROP TYPE IF EXISTS public.service_type CASCADE;
DROP TYPE IF EXISTS public.billing_cycle CASCADE;
DROP TYPE IF EXISTS public.ticket_priority CASCADE;
DROP TYPE IF EXISTS public.ticket_status CASCADE;

-- Add WHMCS link columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whmcs_client_id integer,
  ADD COLUMN IF NOT EXISTS whmcs_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_whmcs_client_id
  ON public.profiles(whmcs_client_id);

-- Rebuild handle_new_user without dropped tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Auto-promote known super admins
  IF lower(NEW.email) IN ('abancode26@gmail.com', 'admin@abancool.co.ke') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Rebuild admin_credit_wallet without admin_audit_log
CREATE OR REPLACE FUNCTION public.admin_credit_wallet(_user_id uuid, _amount numeric, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;

  UPDATE wallet_balances
  SET balance = balance + _amount, updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, currency, description)
  VALUES (_user_id, 'adjustment', _amount, 'KES', COALESCE(_description, 'Admin adjustment'));
END;
$function$;

-- Rebuild admin_grant_sms_credits without admin_audit_log
CREATE OR REPLACE FUNCTION public.admin_grant_sms_credits(_user_id uuid, _credits integer, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  INSERT INTO sms_credits (user_id, balance) VALUES (_user_id, _credits)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = sms_credits.balance + EXCLUDED.balance, updated_at = now();
END;
$function$;

-- Rebuild admin_set_role without admin_audit_log
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can change roles';
  END IF;

  DELETE FROM user_roles WHERE user_id = _user_id;
  INSERT INTO user_roles (user_id, role) VALUES (_user_id, _role);
END;
$function$;