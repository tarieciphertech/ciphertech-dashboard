BEGIN;

CREATE OR REPLACE FUNCTION public.sync_customer_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  IF NEW.role = 'client' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    v_name := COALESCE(
      NULLIF(btrim(NEW.full_name), ''),
      NULLIF(split_part(COALESCE(v_email, ''), '@', 1), ''),
      'Customer'
    );

    INSERT INTO public.customers (profile_id, full_name, phone)
    VALUES (NEW.id, v_name, NULLIF(btrim(NEW.phone), ''))
    ON CONFLICT (profile_id) DO UPDATE
      SET full_name = CASE WHEN public.customers.full_name IS NULL OR btrim(public.customers.full_name) = '' THEN EXCLUDED.full_name ELSE public.customers.full_name END,
          phone = CASE WHEN public.customers.phone IS NULL OR btrim(public.customers.phone) = '' THEN EXCLUDED.phone ELSE public.customers.phone END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
