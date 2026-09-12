BEGIN;

ALTER TABLE public.customers ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text;

UPDATE public.customers c
SET full_name = p.full_name
FROM public.profiles p
WHERE c.profile_id = p.id
  AND c.full_name IS NULL
  AND p.full_name IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.customers WHERE full_name IS NULL OR btrim(full_name) = '') THEN
    RAISE EXCEPTION 'Cannot enforce customers.full_name NOT NULL: existing customer rows are missing names';
  END IF;
END $$;

ALTER TABLE public.customers ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_profile_id_fkey;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customers_profile_id_idx ON public.customers(profile_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
CREATE INDEX IF NOT EXISTS customers_status_idx ON public.customers(customer_status);

CREATE OR REPLACE FUNCTION public.sync_customer_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO public.customers (profile_id, full_name, phone)
    VALUES (NEW.id, NULLIF(btrim(NEW.full_name), ''), NULLIF(btrim(NEW.phone), ''))
    ON CONFLICT (profile_id) DO UPDATE
      SET full_name = COALESCE(public.customers.full_name, EXCLUDED.full_name),
          phone = COALESCE(public.customers.phone, EXCLUDED.phone);
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS customers_manage_staff ON public.customers;
CREATE POLICY customers_manage_staff ON public.customers
FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

COMMIT;
