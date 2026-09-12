CREATE OR REPLACE VIEW public.finance_profitability_summary
WITH (security_invoker = true)
AS
 SELECT
   COALESCE((SELECT sum(i.amount) FROM public.income i WHERE i.status = 'confirmed'::text), 0::numeric)::numeric(14,2) AS revenue_received,
   COALESCE((SELECT sum(p.parts_cost + p.labor_cost + p.other_direct_costs) FROM public.repair_profitability p), 0::numeric)::numeric(14,2) AS repair_direct_costs,
   COALESCE((SELECT sum(p.revenue_received) FROM public.repair_profitability p), 0::numeric)::numeric(14,2) AS repair_revenue_received,
   COALESCE((SELECT sum(p.realized_profit) FROM public.repair_profitability p), 0::numeric)::numeric(14,2) AS repair_realized_profit,
   COALESCE((SELECT sum(e.amount) FROM public.expenses e WHERE e.status = 'confirmed'::text), 0::numeric)::numeric(14,2) AS business_expenses,
   COALESCE((SELECT sum(d.amount) FROM public.deductions d WHERE d.status = 'confirmed'::text), 0::numeric)::numeric(14,2) AS deductions,
   (COALESCE((SELECT sum(i.amount) FROM public.income i WHERE i.status = 'confirmed'::text), 0::numeric) - COALESCE((SELECT sum(e.amount) FROM public.expenses e WHERE e.status = 'confirmed'::text), 0::numeric) - COALESCE((SELECT sum(d.amount) FROM public.deductions d WHERE d.status = 'confirmed'::text), 0::numeric))::numeric(14,2) AS net_position,
   (SELECT count(*) FROM public.repairs)::bigint AS repair_count;
