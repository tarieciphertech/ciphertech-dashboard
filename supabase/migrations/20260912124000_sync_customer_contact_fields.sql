BEGIN;

UPDATE public.customers c
SET full_name = COALESCE(NULLIF(btrim(c.full_name), ''), NULLIF(btrim(p.full_name), ''), c.full_name),
    phone = COALESCE(NULLIF(btrim(c.phone), ''), NULLIF(btrim(p.phone), '')),
    email = COALESCE(NULLIF(btrim(c.email), ''), u.email),
    updated_at = now()
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE c.profile_id = p.id;

CREATE OR REPLACE FUNCTION public.sync_customer_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_email text; v_name text;
BEGIN
  IF NEW.role = 'client' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    v_name := COALESCE(NULLIF(btrim(NEW.full_name), ''), NULLIF(split_part(COALESCE(v_email, ''), '@', 1), ''), 'Customer');
    INSERT INTO public.customers (profile_id, full_name, phone, email)
    VALUES (NEW.id, v_name, NULLIF(btrim(NEW.phone), ''), v_email)
    ON CONFLICT (profile_id) DO UPDATE
      SET full_name = CASE WHEN public.customers.full_name IS NULL OR btrim(public.customers.full_name) = '' THEN EXCLUDED.full_name ELSE public.customers.full_name END,
          phone = CASE WHEN public.customers.phone IS NULL OR btrim(public.customers.phone) = '' THEN EXCLUDED.phone ELSE public.customers.phone END,
          email = CASE WHEN public.customers.email IS NULL OR btrim(public.customers.email) = '' THEN EXCLUDED.email ELSE public.customers.email END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
