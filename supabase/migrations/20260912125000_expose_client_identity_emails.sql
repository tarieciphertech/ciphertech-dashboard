create or replace function public.get_client_identity_emails(p_user_ids uuid[])
returns table(user_id uuid, email text)
language sql
security definer
set search_path = public, auth
as $$
  select u.id, u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = any(p_user_ids)
    and p.role = 'client';
$$;

revoke all on function public.get_client_identity_emails(uuid[]) from public;
grant execute on function public.get_client_identity_emails(uuid[]) to authenticated;
