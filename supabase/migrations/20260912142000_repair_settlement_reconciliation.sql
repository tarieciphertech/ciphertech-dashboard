alter table public.repairs
  add column if not exists financially_closed_at timestamptz null,
  add column if not exists financially_closed_by uuid null references public.profiles(id);

create index if not exists repairs_financially_closed_idx on public.repairs(financially_closed_at);

create or replace view public.repair_financial_control as
select r.id as repair_id,r.customer_id,c.full_name as customer_name,r.brand,r.model,r.repair_status,r.intake_date,r.quoted_amount,r.total_amount as customer_total,
coalesce(p.parts_charged,0)::numeric(12,2) as parts_charged,coalesce(l.labor_charged,0)::numeric(12,2) as labor_charged,
(coalesce(p.parts_charged,0)+coalesce(l.labor_charged,0))::numeric(12,2) as component_customer_charges,
(r.total_amount-coalesce(p.parts_charged,0)-coalesce(l.labor_charged,0))::numeric(12,2) as unallocated_customer_charges,
coalesce(pay.revenue_received,0)::numeric(12,2) as actual_money_received,coalesce(pay.payment_records_received,0)::numeric(12,2) as confirmed_payment_records,
(coalesce(pay.revenue_received,0)-coalesce(pay.payment_records_received,0))::numeric(12,2) as payment_reconciliation_variance,
coalesce(pay.pending_amount,0)::numeric(12,2) as pending_payment_amount,
coalesce(p.parts_cost,0)::numeric(12,2) as part_costs,coalesce(l.labor_cost,0)::numeric(12,2) as labor_costs,
coalesce(e.repair_linked_expenses,0)::numeric(12,2) as repair_linked_expenses,
(coalesce(p.parts_cost,0)+coalesce(l.labor_cost,0)+coalesce(e.repair_linked_expenses,0))::numeric(12,2) as total_direct_costs,
(coalesce(pay.revenue_received,0)-coalesce(p.parts_cost,0)-coalesce(l.labor_cost,0)-coalesce(e.repair_linked_expenses,0))::numeric(12,2) as realized_profit,
case when coalesce(pay.revenue_received,0)>0 then round((coalesce(pay.revenue_received,0)-coalesce(p.parts_cost,0)-coalesce(l.labor_cost,0)-coalesce(e.repair_linked_expenses,0))/coalesce(pay.revenue_received,0)*100,2) else 0 end::numeric(12,2) as realized_margin_percent,
case when abs(coalesce(pay.revenue_received,0)-coalesce(pay.payment_records_received,0))>0.01 or coalesce(pay.unlinked_confirmed_payments,0)>0 then 'needs_review' else 'reconciled' end as payment_control_status,
greatest(r.total_amount-coalesce(pay.revenue_received,0),0)::numeric(12,2) as balance_due,
greatest(coalesce(pay.revenue_received,0)-r.total_amount,0)::numeric(12,2) as overpayment_amount,
coalesce(pay.unlinked_confirmed_payments,0)::integer as unlinked_confirmed_payments,
(coalesce(e.pending_repair_expenses,0)=0 and coalesce(e.voided_repair_expenses,0)=0) as costs_complete,
coalesce(e.pending_repair_expenses,0)::integer as pending_repair_expenses,coalesce(e.voided_repair_expenses,0)::integer as voided_repair_expenses,
r.financially_closed_at,r.financially_closed_by,
case when r.financially_closed_at is not null then 'CLOSED'
when abs(coalesce(pay.revenue_received,0)-coalesce(pay.payment_records_received,0))>0.01 or coalesce(pay.unlinked_confirmed_payments,0)>0 then 'REVIEW'
when coalesce(pay.revenue_received,0)>r.total_amount+0.01 then 'OVERPAID'
when coalesce(pay.revenue_received,0)<=0.01 then 'UNPAID'
when r.total_amount-coalesce(pay.revenue_received,0)>0.01 then 'PARTIALLY PAID'
when not (coalesce(e.pending_repair_expenses,0)=0 and coalesce(e.voided_repair_expenses,0)=0) then 'COSTS INCOMPLETE'
when r.repair_status='completed' then 'READY TO CLOSE' else 'PAID' end as settlement_status
from public.repairs r left join public.customers c on c.id=r.customer_id
left join (select repair_id,sum(quantity*unit_cost) parts_cost,sum(quantity*unit_price) parts_charged from public.repair_parts group by repair_id) p on p.repair_id=r.id
left join (select repair_id,sum(quantity*unit_cost) labor_cost,sum(quantity*unit_price) labor_charged from public.repair_labor group by repair_id) l on l.repair_id=r.id
left join (select repair_id,sum(amount) filter(where status='confirmed') repair_linked_expenses,count(*) filter(where status='pending') pending_repair_expenses,count(*) filter(where status='voided') voided_repair_expenses from public.expenses where repair_id is not null group by repair_id) e on e.repair_id=r.id
left join (select rp.repair_id,sum(i.amount) filter(where i.status='confirmed') revenue_received,sum(rp.amount) filter(where rp.payment_status='confirmed') payment_records_received,sum(rp.amount) filter(where rp.payment_status='pending') pending_amount,count(*) filter(where rp.payment_status='confirmed' and rp.income_id is null) unlinked_confirmed_payments from public.repair_payments rp left join public.income i on i.id=rp.income_id group by rp.repair_id) pay on pay.repair_id=r.id;

alter view public.repair_financial_control set (security_invoker=true);
grant select on public.repair_financial_control to authenticated;

create or replace function public.close_repair_financially(p_repair_id uuid) returns public.repair_financial_control language plpgsql security definer set search_path=public,auth as $$
declare v public.repair_financial_control%rowtype;
begin
  if not public.is_admin() then raise exception 'Only an admin can financially close a repair'; end if;
  select * into v from public.repair_financial_control where repair_id=p_repair_id;
  if not found then raise exception 'Repair not found'; end if;
  if v.financially_closed_at is not null then return v; end if;
  if v.repair_status <> 'completed' then raise exception 'Repair must be technically completed before financial closure'; end if;
  if v.payment_control_status <> 'reconciled' then raise exception 'Payment reconciliation requires review before closure'; end if;
  if v.balance_due > 0.01 then raise exception 'Customer still owes %',v.balance_due; end if;
  if v.overpayment_amount > 0.01 then raise exception 'Repair is overpaid by %',v.overpayment_amount; end if;
  if not v.costs_complete then raise exception 'Repair costs are incomplete'; end if;
  update public.repairs set financially_closed_at=now(),financially_closed_by=auth.uid(),updated_at=now() where id=p_repair_id;
  select * into v from public.repair_financial_control where repair_id=p_repair_id;
  return v;
end; $$;
revoke all on function public.close_repair_financially(uuid) from public,anon,authenticated;
grant execute on function public.close_repair_financially(uuid) to authenticated;

create or replace function public.prevent_closed_repair_changes() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.repairs where id=case when TG_OP='DELETE' then old.repair_id else new.repair_id end and financially_closed_at is not null) then raise exception 'Financially closed repairs cannot be modified'; end if;
  if TG_OP='DELETE' then return old; else return new; end if;
end; $$;

drop trigger if exists repair_parts_closed_guard on public.repair_parts;
create trigger repair_parts_closed_guard before insert or update or delete on public.repair_parts for each row execute function public.prevent_closed_repair_changes();
drop trigger if exists repair_labor_closed_guard on public.repair_labor;
create trigger repair_labor_closed_guard before insert or update or delete on public.repair_labor for each row execute function public.prevent_closed_repair_changes();
drop trigger if exists repair_payments_closed_guard on public.repair_payments;
create trigger repair_payments_closed_guard before insert or update or delete on public.repair_payments for each row execute function public.prevent_closed_repair_changes();
drop trigger if exists repair_expenses_closed_guard on public.expenses;
create trigger repair_expenses_closed_guard before insert or update or delete on public.expenses for each row execute function public.prevent_closed_repair_changes();
revoke all on function public.prevent_closed_repair_changes() from public,anon;
grant execute on function public.prevent_closed_repair_changes() to authenticated;

create or replace function public.prevent_closed_repair_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.financially_closed_at is not null then raise exception 'Financially closed repairs cannot be modified'; end if;
  return new;
end; $$;
drop trigger if exists repairs_closed_guard on public.repairs;
create trigger repairs_closed_guard before update on public.repairs for each row when (old.financially_closed_at is not null) execute function public.prevent_closed_repair_update();
revoke all on function public.prevent_closed_repair_update() from public,anon;
grant execute on function public.prevent_closed_repair_update() to authenticated;
