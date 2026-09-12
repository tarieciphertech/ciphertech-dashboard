-- Operational records are owned by the authenticated staff member by default.
-- RLS remains the authorization boundary.
alter table public.repairs alter column created_by set default auth.uid();
alter table public.project_tasks alter column created_by set default auth.uid();
alter table public.income alter column recorded_by set default auth.uid();
alter table public.expenses alter column recorded_by set default auth.uid();
alter table public.deductions alter column recorded_by set default auth.uid();
alter table public.repair_payments alter column received_by set default auth.uid();
