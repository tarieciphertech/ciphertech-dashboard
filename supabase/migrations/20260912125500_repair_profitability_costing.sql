BEGIN;

ALTER TABLE public.repair_labor
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.repair_labor
  DROP CONSTRAINT IF EXISTS repair_labor_unit_cost_check;
ALTER TABLE public.repair_labor
  ADD CONSTRAINT repair_labor_unit_cost_check CHECK (unit_cost >= 0);

CREATE OR REPLACE VIEW public.repair_profitability AS
SELECT
  r.id AS repair_id,
  r.customer_id,
  r.brand,
  r.model,
  r.repair_status,
  r.priority,
  r.quoted_amount,
  r.total_amount AS customer_total,
  COALESCE(p.parts_cost,0)::numeric(12,2) AS parts_cost,
  COALESCE(p.parts_charged,0)::numeric(12,2) AS parts_charged,
  COALESCE(l.labor_cost,0)::numeric(12,2) AS labor_cost,
  COALESCE(l.labor_charged,0)::numeric(12,2) AS labor_charged,
  COALESCE(e.other_direct_costs,0)::numeric(12,2) AS other_direct_costs,
  COALESCE(i.revenue_received,0)::numeric(12,2) AS revenue_received,
  (COALESCE(i.revenue_received,0) - COALESCE(p.parts_cost,0) - COALESCE(l.labor_cost,0) - COALESCE(e.other_direct_costs,0))::numeric(12,2) AS realized_profit,
  CASE WHEN COALESCE(i.revenue_received,0) > 0 THEN ROUND(((COALESCE(i.revenue_received,0) - COALESCE(p.parts_cost,0) - COALESCE(l.labor_cost,0) - COALESCE(e.other_direct_costs,0)) / COALESCE(i.revenue_received,0) * 100),2) ELSE 0 END::numeric(12,2) AS realized_margin_percent
FROM public.repairs r
LEFT JOIN (
  SELECT repair_id, SUM(quantity * unit_cost) parts_cost, SUM(quantity * unit_price) parts_charged
  FROM public.repair_parts GROUP BY repair_id
) p ON p.repair_id=r.id
LEFT JOIN (
  SELECT repair_id, SUM(quantity * unit_cost) labor_cost, SUM(quantity * unit_price) labor_charged
  FROM public.repair_labor GROUP BY repair_id
) l ON l.repair_id=r.id
LEFT JOIN (
  SELECT repair_id, SUM(amount) FILTER (WHERE status='confirmed') other_direct_costs
  FROM public.expenses WHERE repair_id IS NOT NULL GROUP BY repair_id
) e ON e.repair_id=r.id
LEFT JOIN (
  SELECT repair_id, SUM(amount) FILTER (WHERE status='confirmed') revenue_received
  FROM public.income WHERE repair_id IS NOT NULL GROUP BY repair_id
) i ON i.repair_id=r.id;

ALTER VIEW public.repair_profitability SET (security_invoker = true);
COMMIT;
