-- Extend the repair profitability reporting view with repair timing and customer context.
DROP VIEW IF EXISTS public.repair_profitability;

CREATE VIEW public.repair_profitability
WITH (security_invoker = true)
AS
 SELECT r.id AS repair_id,
    r.customer_id,
    r.brand,
    r.model,
    r.repair_status,
    r.priority,
    r.intake_date,
    r.completed_at,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    r.quoted_amount,
    r.total_amount AS customer_total,
    COALESCE(p.parts_cost, 0::numeric)::numeric(12,2) AS parts_cost,
    COALESCE(p.parts_charged, 0::numeric)::numeric(12,2) AS parts_charged,
    COALESCE(l.labor_cost, 0::numeric)::numeric(12,2) AS labor_cost,
    COALESCE(l.labor_charged, 0::numeric)::numeric(12,2) AS labor_charged,
    COALESCE(e.other_direct_costs, 0::numeric)::numeric(12,2) AS other_direct_costs,
    COALESCE(i.revenue_received, 0::numeric)::numeric(12,2) AS revenue_received,
    (COALESCE(i.revenue_received, 0::numeric) - COALESCE(p.parts_cost, 0::numeric) - COALESCE(l.labor_cost, 0::numeric) - COALESCE(e.other_direct_costs, 0::numeric))::numeric(12,2) AS realized_profit,
    CASE
      WHEN COALESCE(i.revenue_received, 0::numeric) > 0::numeric THEN round((COALESCE(i.revenue_received, 0::numeric) - COALESCE(p.parts_cost, 0::numeric) - COALESCE(l.labor_cost, 0::numeric) - COALESCE(e.other_direct_costs, 0::numeric)) / COALESCE(i.revenue_received, 0::numeric) * 100::numeric, 2)
      ELSE 0::numeric
    END::numeric(12,2) AS realized_margin_percent
   FROM public.repairs r
     LEFT JOIN public.customers c ON c.id = r.customer_id
     LEFT JOIN ( SELECT repair_parts.repair_id,
            sum(repair_parts.quantity * repair_parts.unit_cost) AS parts_cost,
            sum(repair_parts.quantity * repair_parts.unit_price) AS parts_charged
           FROM public.repair_parts
          GROUP BY repair_parts.repair_id) p ON p.repair_id = r.id
     LEFT JOIN ( SELECT repair_labor.repair_id,
            sum(repair_labor.quantity * repair_labor.unit_cost) AS labor_cost,
            sum(repair_labor.quantity * repair_labor.unit_price) AS labor_charged
           FROM public.repair_labor
          GROUP BY repair_labor.repair_id) l ON l.repair_id = r.id
     LEFT JOIN ( SELECT expenses.repair_id,
            sum(expenses.amount) FILTER (WHERE expenses.status = 'confirmed'::text) AS other_direct_costs
           FROM public.expenses
          WHERE expenses.repair_id IS NOT NULL
          GROUP BY expenses.repair_id) e ON e.repair_id = r.id
     LEFT JOIN ( SELECT income.repair_id,
            sum(income.amount) FILTER (WHERE income.status = 'confirmed'::text) AS revenue_received
           FROM public.income
          WHERE income.repair_id IS NOT NULL
          GROUP BY income.repair_id) i ON i.repair_id = r.id;

CREATE INDEX IF NOT EXISTS repairs_intake_date_idx ON public.repairs (intake_date DESC);
