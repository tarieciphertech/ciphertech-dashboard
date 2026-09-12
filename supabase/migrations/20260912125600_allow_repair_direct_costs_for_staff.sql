BEGIN;
DROP POLICY IF EXISTS expenses_repair_direct_costs_staff ON public.expenses;
CREATE POLICY expenses_repair_direct_costs_staff ON public.expenses
  FOR ALL TO authenticated
  USING (is_staff_or_admin() AND repair_id IS NOT NULL)
  WITH CHECK (is_staff_or_admin() AND repair_id IS NOT NULL);
COMMIT;
