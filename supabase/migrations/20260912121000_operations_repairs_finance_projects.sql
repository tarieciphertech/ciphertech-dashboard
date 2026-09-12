BEGIN;

CREATE TABLE IF NOT EXISTS public.repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  device_type text NOT NULL, brand text NOT NULL, model text NOT NULL,
  serial_number text, imei text, issue_reported text NOT NULL, diagnosis text,
  repair_status text NOT NULL DEFAULT 'received', priority text NOT NULL DEFAULT 'normal',
  intake_date timestamptz NOT NULL DEFAULT now(), expected_completion_date date, completed_at timestamptz,
  quoted_amount numeric(12,2) NOT NULL DEFAULT 0, total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repairs_status_check CHECK (repair_status IN ('received','diagnosing','awaiting_approval','awaiting_parts','in_repair','ready_for_collection','completed','cancelled')),
  CONSTRAINT repairs_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT repairs_quoted_amount_check CHECK (quoted_amount >= 0),
  CONSTRAINT repairs_total_amount_check CHECK (total_amount >= 0),
  CONSTRAINT repairs_completion_date_check CHECK (expected_completion_date IS NULL OR expected_completion_date >= intake_date::date),
  CONSTRAINT repairs_completed_at_check CHECK (completed_at IS NULL OR repair_status = 'completed')
);
CREATE INDEX IF NOT EXISTS repairs_customer_id_idx ON public.repairs(customer_id);
CREATE INDEX IF NOT EXISTS repairs_assigned_to_idx ON public.repairs(assigned_to);
CREATE INDEX IF NOT EXISTS repairs_status_idx ON public.repairs(repair_status);
CREATE INDEX IF NOT EXISTS repairs_priority_idx ON public.repairs(priority);
CREATE INDEX IF NOT EXISTS repairs_intake_date_idx ON public.repairs(intake_date);
CREATE INDEX IF NOT EXISTS repairs_created_at_idx ON public.repairs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE RESTRICT,
  part_name text NOT NULL, description text, quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0, unit_price numeric(12,2) NOT NULL DEFAULT 0,
  supplier text, reference text, installed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_parts_quantity_check CHECK (quantity > 0),
  CONSTRAINT repair_parts_unit_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT repair_parts_unit_price_check CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS repair_parts_repair_id_idx ON public.repair_parts(repair_id);

CREATE TABLE IF NOT EXISTS public.repair_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE RESTRICT,
  technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, description text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1, unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_labor_quantity_check CHECK (quantity > 0),
  CONSTRAINT repair_labor_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT repair_labor_total_amount_check CHECK (total_amount >= 0)
);
CREATE INDEX IF NOT EXISTS repair_labor_repair_id_idx ON public.repair_labor(repair_id);
CREATE INDEX IF NOT EXISTS repair_labor_technician_id_idx ON public.repair_labor(technician_id);

CREATE TABLE IF NOT EXISTS public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE RESTRICT,
  old_status text, new_status text NOT NULL, changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  note text, changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_status_history_new_status_check CHECK (new_status IN ('received','diagnosing','awaiting_approval','awaiting_parts','in_repair','ready_for_collection','completed','cancelled')),
  CONSTRAINT repair_status_history_old_status_check CHECK (old_status IS NULL OR old_status IN ('received','diagnosing','awaiting_approval','awaiting_parts','in_repair','ready_for_collection','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS repair_status_history_repair_id_idx ON public.repair_status_history(repair_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric(12,2) NOT NULL, income_date timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL, description text, payment_method text, reference text,
  repair_id uuid REFERENCES public.repairs(id) ON DELETE RESTRICT, project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'confirmed', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT income_amount_check CHECK (amount >= 0),
  CONSTRAINT income_status_check CHECK (status IN ('pending','confirmed','voided','refunded')),
  CONSTRAINT income_category_check CHECK (category IN ('repair_payment','project_payment','service_income','product_sale','consulting','other'))
);
CREATE INDEX IF NOT EXISTS income_date_idx ON public.income(income_date DESC);
CREATE INDEX IF NOT EXISTS income_category_idx ON public.income(category);
CREATE INDEX IF NOT EXISTS income_repair_id_idx ON public.income(repair_id);
CREATE INDEX IF NOT EXISTS income_project_id_idx ON public.income(project_id);
CREATE INDEX IF NOT EXISTS income_customer_id_idx ON public.income(customer_id);
CREATE INDEX IF NOT EXISTS income_status_idx ON public.income(status);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric(12,2) NOT NULL, expense_date timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL, description text NOT NULL, payment_method text, reference text,
  repair_id uuid REFERENCES public.repairs(id) ON DELETE RESTRICT, project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_check CHECK (amount >= 0),
  CONSTRAINT expenses_status_check CHECK (status IN ('pending','confirmed','voided','refunded')),
  CONSTRAINT expenses_category_check CHECK (category IN ('parts','equipment','transport','internet','hosting','software','rent','utilities','marketing','office','maintenance','other'))
);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses(category);
CREATE INDEX IF NOT EXISTS expenses_repair_id_idx ON public.expenses(repair_id);
CREATE INDEX IF NOT EXISTS expenses_project_id_idx ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);

CREATE TABLE IF NOT EXISTS public.deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric(12,2) NOT NULL, deduction_date timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL, description text NOT NULL, reference text,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deductions_amount_check CHECK (amount >= 0),
  CONSTRAINT deductions_status_check CHECK (status IN ('pending','confirmed','voided')),
  CONSTRAINT deductions_category_check CHECK (category IN ('owner_withdrawal','tax','bank_charges','other'))
);
CREATE INDEX IF NOT EXISTS deductions_date_idx ON public.deductions(deduction_date DESC);
CREATE INDEX IF NOT EXISTS deductions_category_idx ON public.deductions(category);
CREATE INDEX IF NOT EXISTS deductions_status_idx ON public.deductions(status);

CREATE TABLE IF NOT EXISTS public.repair_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE RESTRICT,
  income_id uuid UNIQUE REFERENCES public.income(id) ON DELETE RESTRICT, amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL, reference text, payment_status text NOT NULL DEFAULT 'pending', paid_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, notes text, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_payments_amount_check CHECK (amount > 0),
  CONSTRAINT repair_payments_status_check CHECK (payment_status IN ('pending','confirmed','voided','refunded')),
  CONSTRAINT repair_payments_method_check CHECK (payment_method IN ('cash','ecocash','bank_transfer','card','paypal','other')),
  CONSTRAINT repair_payments_confirmed_income_check CHECK (payment_status = 'pending' OR income_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS repair_payments_repair_id_idx ON public.repair_payments(repair_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS repair_payments_income_id_idx ON public.repair_payments(income_id);
CREATE INDEX IF NOT EXISTS repair_payments_status_idx ON public.repair_payments(payment_status);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL, description text, assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo', priority text NOT NULL DEFAULT 'normal', start_date date, due_date date, completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_tasks_status_check CHECK (status IN ('todo','in_progress','blocked','completed','cancelled')),
  CONSTRAINT project_tasks_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT project_tasks_dates_check CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date),
  CONSTRAINT project_tasks_completed_at_check CHECK (completed_at IS NULL OR status = 'completed')
);
CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_assigned_to_idx ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON public.project_tasks(status);
CREATE INDEX IF NOT EXISTS project_tasks_due_date_idx ON public.project_tasks(due_date);

DROP TRIGGER IF EXISTS repairs_set_updated_at ON public.repairs;
CREATE TRIGGER repairs_set_updated_at BEFORE UPDATE ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS repair_parts_set_updated_at ON public.repair_parts;
CREATE TRIGGER repair_parts_set_updated_at BEFORE UPDATE ON public.repair_parts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS repair_labor_set_updated_at ON public.repair_labor;
CREATE TRIGGER repair_labor_set_updated_at BEFORE UPDATE ON public.repair_labor FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS income_set_updated_at ON public.income;
CREATE TRIGGER income_set_updated_at BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS expenses_set_updated_at ON public.expenses;
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS deductions_set_updated_at ON public.deductions;
CREATE TRIGGER deductions_set_updated_at BEFORE UPDATE ON public.deductions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS project_tasks_set_updated_at ON public.project_tasks;
CREATE TRIGGER project_tasks_set_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_repair_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.repair_status_history (repair_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.repair_status, COALESCE(auth.uid(), NEW.created_by), 'Repair created');
  ELSIF NEW.repair_status IS DISTINCT FROM OLD.repair_status THEN
    INSERT INTO public.repair_status_history (repair_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.repair_status, NEW.repair_status, COALESCE(auth.uid(), NEW.created_by), NULL);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS repairs_record_status_change ON public.repairs;
CREATE TRIGGER repairs_record_status_change AFTER INSERT OR UPDATE OF repair_status ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.record_repair_status_change();

CREATE OR REPLACE FUNCTION public.sync_repair_payment_income()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_income_id uuid; v_customer_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'pending' THEN NEW.income_id := NULL; RETURN NEW; END IF;
    IF NEW.income_id IS NOT NULL THEN RAISE EXCEPTION 'income_id is managed automatically for repair payments'; END IF;
    SELECT customer_id INTO v_customer_id FROM public.repairs WHERE id = NEW.repair_id;
    INSERT INTO public.income (amount,income_date,category,description,payment_method,reference,repair_id,customer_id,recorded_by,status)
    VALUES (NEW.amount,NEW.paid_at,'repair_payment','Repair payment',NEW.payment_method,NEW.reference,NEW.repair_id,v_customer_id,NEW.received_by,'confirmed')
    RETURNING id INTO v_income_id;
    NEW.income_id := v_income_id;
    RETURN NEW;
  END IF;
  IF (NEW.amount IS DISTINCT FROM OLD.amount OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.repair_id IS DISTINCT FROM OLD.repair_id OR NEW.received_by IS DISTINCT FROM OLD.received_by) AND OLD.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Confirmed repair payment financial fields cannot be changed; create a correcting transaction instead';
  END IF;
  IF OLD.payment_status = 'pending' AND NEW.payment_status = 'pending' THEN NEW.income_id := NULL; RETURN NEW; END IF;
  IF OLD.payment_status = 'pending' AND NEW.payment_status IN ('confirmed','voided','refunded') THEN
    IF NEW.payment_status = 'confirmed' THEN
      SELECT customer_id INTO v_customer_id FROM public.repairs WHERE id = NEW.repair_id;
      INSERT INTO public.income (amount,income_date,category,description,payment_method,reference,repair_id,customer_id,recorded_by,status)
      VALUES (NEW.amount,NEW.paid_at,'repair_payment','Repair payment',NEW.payment_method,NEW.reference,NEW.repair_id,v_customer_id,NEW.received_by,'confirmed')
      RETURNING id INTO v_income_id;
      NEW.income_id := v_income_id;
    ELSE NEW.income_id := NULL; END IF;
    RETURN NEW;
  END IF;
  IF NEW.income_id IS NULL THEN RAISE EXCEPTION 'A non-pending repair payment must have an income transaction'; END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    UPDATE public.income SET status = CASE NEW.payment_status WHEN 'confirmed' THEN 'confirmed' WHEN 'voided' THEN 'voided' WHEN 'refunded' THEN 'refunded' ELSE status END, updated_at = now()
    WHERE id = NEW.income_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS repair_payments_sync_income ON public.repair_payments;
CREATE TRIGGER repair_payments_sync_income BEFORE INSERT OR UPDATE ON public.repair_payments FOR EACH ROW EXECUTE FUNCTION public.sync_repair_payment_income();

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS repairs_manage_staff ON public.repairs;
CREATE POLICY repairs_manage_staff ON public.repairs FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS repair_parts_manage_staff ON public.repair_parts;
CREATE POLICY repair_parts_manage_staff ON public.repair_parts FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS repair_labor_manage_staff ON public.repair_labor;
CREATE POLICY repair_labor_manage_staff ON public.repair_labor FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS repair_status_history_select_staff ON public.repair_status_history;
CREATE POLICY repair_status_history_select_staff ON public.repair_status_history FOR SELECT TO authenticated USING (is_staff_or_admin());
DROP POLICY IF EXISTS repair_status_history_manage_admin ON public.repair_status_history;
CREATE POLICY repair_status_history_manage_admin ON public.repair_status_history FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS repair_payments_manage_staff ON public.repair_payments;
CREATE POLICY repair_payments_manage_staff ON public.repair_payments FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS income_manage_admin ON public.income;
CREATE POLICY income_manage_admin ON public.income FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS expenses_manage_admin ON public.expenses;
CREATE POLICY expenses_manage_admin ON public.expenses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS deductions_manage_admin ON public.deductions;
CREATE POLICY deductions_manage_admin ON public.deductions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS project_tasks_manage_staff ON public.project_tasks;
CREATE POLICY project_tasks_manage_staff ON public.project_tasks FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

COMMIT;
