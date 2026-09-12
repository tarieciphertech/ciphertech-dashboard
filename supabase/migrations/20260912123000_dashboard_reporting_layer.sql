BEGIN;

CREATE OR REPLACE VIEW public.repair_balances WITH (security_invoker = true) AS
SELECT r.id AS repair_id, r.customer_id, r.assigned_to, r.device_type, r.brand, r.model,
       r.repair_status, r.priority, r.total_amount,
       COALESCE(SUM(CASE WHEN rp.payment_status='confirmed' THEN rp.amount ELSE 0 END),0)::numeric(12,2) AS amount_paid,
       GREATEST(r.total_amount-COALESCE(SUM(CASE WHEN rp.payment_status='confirmed' THEN rp.amount ELSE 0 END),0),0)::numeric(12,2) AS amount_due,
       COUNT(rp.id)::bigint AS payment_count,
       MAX(rp.paid_at) FILTER (WHERE rp.payment_status='confirmed') AS last_payment_at,
       r.intake_date, r.expected_completion_date, r.created_at, r.updated_at
FROM public.repairs r LEFT JOIN public.repair_payments rp ON rp.repair_id=r.id
GROUP BY r.id;

CREATE OR REPLACE VIEW public.finance_daily_summary WITH (security_invoker = true) AS
WITH dates AS (
  SELECT income_date::date AS transaction_date FROM public.income WHERE status='confirmed'
  UNION SELECT expense_date::date FROM public.expenses WHERE status='confirmed'
  UNION SELECT deduction_date::date FROM public.deductions WHERE status='confirmed'
)
SELECT d.transaction_date,
       COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND i.income_date::date=d.transaction_date),0)::numeric(14,2) AS income,
       COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND e.expense_date::date=d.transaction_date),0)::numeric(14,2) AS expenses,
       COALESCE((SELECT SUM(x.amount) FROM public.deductions x WHERE x.status='confirmed' AND x.deduction_date::date=d.transaction_date),0)::numeric(14,2) AS deductions,
       (COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND i.income_date::date=d.transaction_date),0)
        -COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND e.expense_date::date=d.transaction_date),0)
        -COALESCE((SELECT SUM(x.amount) FROM public.deductions x WHERE x.status='confirmed' AND x.deduction_date::date=d.transaction_date),0))::numeric(14,2) AS net_position
FROM dates d WHERE is_staff_or_admin() ORDER BY d.transaction_date DESC;

CREATE OR REPLACE VIEW public.finance_monthly_summary WITH (security_invoker = true) AS
WITH months AS (
  SELECT date_trunc('month', income_date)::date AS month_start FROM public.income WHERE status='confirmed'
  UNION SELECT date_trunc('month', expense_date)::date FROM public.expenses WHERE status='confirmed'
  UNION SELECT date_trunc('month', deduction_date)::date FROM public.deductions WHERE status='confirmed'
)
SELECT m.month_start,
       COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND date_trunc('month',i.income_date)::date=m.month_start),0)::numeric(14,2) AS income,
       COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND date_trunc('month',e.expense_date)::date=m.month_start),0)::numeric(14,2) AS expenses,
       COALESCE((SELECT SUM(x.amount) FROM public.deductions x WHERE x.status='confirmed' AND date_trunc('month',x.deduction_date)::date=m.month_start),0)::numeric(14,2) AS deductions,
       (COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND date_trunc('month',i.income_date)::date=m.month_start),0)
        -COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND date_trunc('month',e.expense_date)::date=m.month_start),0)
        -COALESCE((SELECT SUM(x.amount) FROM public.deductions x WHERE x.status='confirmed' AND date_trunc('month',x.deduction_date)::date=m.month_start),0))::numeric(14,2) AS net_position
FROM months m WHERE is_staff_or_admin() ORDER BY m.month_start DESC;

CREATE OR REPLACE VIEW public.dashboard_overview WITH (security_invoker = true) AS
SELECT CURRENT_DATE AS report_date,
       COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND i.income_date::date=CURRENT_DATE),0)::numeric(14,2) AS today_income,
       COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND e.expense_date::date=CURRENT_DATE),0)::numeric(14,2) AS today_expenses,
       COALESCE((SELECT SUM(d.amount) FROM public.deductions d WHERE d.status='confirmed' AND d.deduction_date::date=CURRENT_DATE),0)::numeric(14,2) AS today_deductions,
       (COALESCE((SELECT SUM(i.amount) FROM public.income i WHERE i.status='confirmed' AND i.income_date::date=CURRENT_DATE),0)
        -COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.status='confirmed' AND e.expense_date::date=CURRENT_DATE),0)
        -COALESCE((SELECT SUM(d.amount) FROM public.deductions d WHERE d.status='confirmed' AND d.deduction_date::date=CURRENT_DATE),0))::numeric(14,2) AS today_net_position,
       (SELECT COUNT(*) FROM public.repairs r WHERE r.repair_status NOT IN ('completed','cancelled'))::bigint AS active_repairs,
       (SELECT COUNT(*) FROM public.repair_balances rb WHERE rb.amount_due>0 AND rb.repair_status<>'cancelled')::bigint AS repairs_with_balance,
       (SELECT COUNT(*) FROM public.projects p WHERE p.status IN ('planned','active','on_hold'))::bigint AS active_projects,
       (SELECT COUNT(*) FROM public.project_tasks t WHERE t.status IN ('todo','in_progress','blocked'))::bigint AS open_project_tasks
WHERE is_staff_or_admin();

CREATE INDEX IF NOT EXISTS repair_payments_confirmed_repair_idx ON public.repair_payments(repair_id) WHERE payment_status='confirmed';

COMMIT;
