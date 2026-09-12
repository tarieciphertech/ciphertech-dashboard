-- Repair financial reconciliation/control layer.
-- Separates customer charges, cash received, direct repair costs and business-wide cash costs.
DROP VIEW IF EXISTS public.repair_financial_control;

CREATE VIEW public.repair_financial_control
WITH (security_invoker = true)
AS
SELECT
  r.id AS repair_id,
  r.customer_id,
  c.full_name AS customer_name,
  r.brand,
  r.model,
  r.repair_status,
  r.intake_date,
  r.quoted_amount,
  r.total_amount AS customer_total,
  COALESCE(p.parts_charged, 0)::numeric(12,2) AS parts_charged,
  COALESCE(l.labor_charged, 0)::numeric(12,2) AS labor_charged,
  (COALESCE(p.parts_charged, 0) + COALESCE(l.labor_charged, 0))::numeric(12,2) AS component_customer_charges,
  (r.total_amount - COALESCE(p.parts_charged, 0) - COALESCE(l.labor_charged, 0))::numeric(12,2) AS unallocated_customer_charges,
  COALESCE(pay.revenue_received, 0)::numeric(12,2) AS actual_money_received,
  COALESCE(pay.payment_records_received, 0)::numeric(12,2) AS confirmed_payment_records,
  (COALESCE(pay.revenue_received, 0) - COALESCE(pay.payment_records_received, 0))::numeric(12,2) AS payment_reconciliation_variance,
  COALESCE(pay.pending_amount, 0)::numeric(12,2) AS pending_payment_amount,
  COALESCE(p.parts_cost, 0)::numeric(12,2) AS part_costs,
  COALESCE(l.labor_cost, 0)::numeric(12,2) AS labor_costs,
  COALESCE(e.repair_linked_expenses, 0)::numeric(12,2) AS repair_linked_expenses,
  (COALESCE(p.parts_cost, 0) + COALESCE(l.labor_cost, 0) + COALESCE(e.repair_linked_expenses, 0))::numeric(12,2) AS total_direct_costs,
  (COALESCE(pay.revenue_received, 0) - COALESCE(p.parts_cost, 0) - COALESCE(l.labor_cost, 0) - COALESCE(e.repair_linked_expenses, 0))::numeric(12,2) AS realized_profit,
  CASE WHEN COALESCE(pay.revenue_received, 0) > 0 THEN round(((COALESCE(pay.revenue_received, 0) - COALESCE(p.parts_cost, 0) - COALESCE(l.labor_cost, 0) - COALESCE(e.repair_linked_expenses, 0)) / COALESCE(pay.revenue_received, 0)) * 100, 2) ELSE 0 END::numeric(12,2) AS realized_margin_percent,
  CASE WHEN abs(COALESCE(pay.revenue_received, 0) - COALESCE(pay.payment_records_received, 0)) > 0.01 THEN 'needs_review' ELSE 'reconciled' END AS payment_control_status
FROM public.repairs r
LEFT JOIN public.customers c ON c.id = r.customer_id
LEFT JOIN (
  SELECT repair_id,
    SUM(quantity * unit_cost) AS parts_cost,
    SUM(quantity * unit_price) AS parts_charged
  FROM public.repair_parts GROUP BY repair_id
) p ON p.repair_id = r.id
LEFT JOIN (
  SELECT repair_id,
    SUM(quantity * unit_cost) AS labor_cost,
    SUM(quantity * unit_price) AS labor_charged
  FROM public.repair_labor GROUP BY repair_id
) l ON l.repair_id = r.id
LEFT JOIN (
  SELECT repair_id,
    SUM(amount) FILTER (WHERE status = 'confirmed') AS repair_linked_expenses
  FROM public.expenses
  WHERE repair_id IS NOT NULL
  GROUP BY repair_id
) e ON e.repair_id = r.id
LEFT JOIN (
  SELECT rp.repair_id,
    SUM(i.amount) FILTER (WHERE i.status = 'confirmed') AS revenue_received,
    SUM(rp.amount) FILTER (WHERE rp.payment_status = 'confirmed') AS payment_records_received,
    SUM(rp.amount) FILTER (WHERE rp.payment_status = 'pending') AS pending_amount
  FROM public.repair_payments rp
  LEFT JOIN public.income i ON i.id = rp.income_id
  GROUP BY rp.repair_id
) pay ON pay.repair_id = r.id;

CREATE INDEX IF NOT EXISTS expenses_business_scope_idx
  ON public.expenses (expense_date DESC)
  WHERE repair_id IS NULL;
CREATE INDEX IF NOT EXISTS income_repair_status_idx
  ON public.income (repair_id, status);
CREATE INDEX IF NOT EXISTS repair_payments_repair_status_idx
  ON public.repair_payments (repair_id, payment_status);

DROP VIEW IF EXISTS public.finance_control_summary;

CREATE VIEW public.finance_control_summary
WITH (security_invoker = true)
AS
SELECT
  COALESCE((SELECT SUM(amount) FROM public.income WHERE status = 'confirmed'), 0)::numeric(12,2) AS actual_money_received,
  COALESCE((SELECT SUM(rfc.customer_total) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS repair_customer_charges,
  COALESCE((SELECT SUM(rfc.actual_money_received) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS repair_money_received,
  COALESCE((SELECT SUM(rfc.part_costs) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS part_costs,
  COALESCE((SELECT SUM(rfc.labor_costs) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS labor_costs,
  COALESCE((SELECT SUM(rfc.repair_linked_expenses) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS repair_linked_expenses,
  COALESCE((SELECT SUM(rfc.total_direct_costs) FROM public.repair_financial_control rfc), 0)::numeric(12,2) AS total_repair_direct_costs,
  COALESCE((SELECT SUM(rfc.realized_profit) FROM public.repair_financial_control rfc WHERE rfc.actual_money_received > 0), 0)::numeric(12,2) AS repair_realized_profit,
  COALESCE((SELECT SUM(amount) FROM public.expenses WHERE status = 'confirmed' AND repair_id IS NULL), 0)::numeric(12,2) AS business_wide_expenses,
  COALESCE((SELECT SUM(amount) FROM public.deductions WHERE status = 'confirmed'), 0)::numeric(12,2) AS deductions,
  (
    COALESCE((SELECT SUM(amount) FROM public.income WHERE status = 'confirmed'), 0)
    - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE status = 'confirmed'), 0)
    - COALESCE((SELECT SUM(amount) FROM public.deductions WHERE status = 'confirmed'), 0)
  )::numeric(12,2) AS actual_business_cash_position,
  (SELECT COUNT(*) FROM public.repair_financial_control WHERE payment_control_status = 'needs_review')::integer AS payment_reconciliation_issues,
  (SELECT COUNT(*) FROM public.repair_financial_control WHERE abs(unallocated_customer_charges) > 0.01)::integer AS charge_reconciliation_items;
