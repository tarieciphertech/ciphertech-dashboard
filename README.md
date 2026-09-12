# Cypher Technologies Admin Portal

Internal operations portal for Cypher Technologies.

## Architecture

- `cyphertech.co.zw` — public client-facing website
- `admin.cyphertech.co.zw` — this internal staff portal
- Supabase — authentication, PostgreSQL data and Row Level Security
- Render — reserved for privileged server-side operations, integrations and jobs

The admin frontend must never contain a Supabase service-role key or other server secret.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`.
4. Run `npm run dev`.

Only users whose `profiles.role` is `admin` or `staff` can enter the portal.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the Vite app. Configure these GitHub repository/environment variables for the `github-pages` environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL` (optional until the Render API is introduced)

Configure GitHub Pages to use **GitHub Actions** as the source. `public/CNAME` sets the production hostname to `admin.cyphertech.co.zw`.

## Supabase requirements

The shared Supabase project should expose only the publishable/anon key to this browser application. RLS remains the database authorization boundary.

Required profile authorization convention:

- `admin` — full administrative access
- `staff` — operational access granted by RLS/policies

The portal currently reads these shared tables: `inquiries`, `tickets`, `projects`, `services`, `notifications`, `profiles`, and `files`.

## Database foundation

The dashboard database foundation is now implemented in `supabase/migrations/`.

The operational model supports both authenticated account customers and walk-in/non-account customers. A customer record may have a nullable `profile_id`; customer history is independent of account role changes.

Core operational domains:

- Customers
- Repairs
- Repair parts and labor
- Repair payments and status history
- Income, expenses and deductions
- Existing projects plus project tasks
- Dashboard reporting views

Financial source-of-truth rules:

- `income` is the authoritative income ledger.
- `expenses` is the authoritative expense ledger.
- `deductions` is the authoritative deductions ledger.
- `repair_payments` is the operational payment record and links one-to-one to its generated income transaction when confirmed.
- Dashboard totals are derived; mutable daily counters are not stored.
- Project expenses use `expenses.project_id`; there is no duplicate project-expense ledger.

The reporting layer provides `repair_balances`, `finance_daily_summary`, `finance_monthly_summary`, and `dashboard_overview` views. These use `security_invoker` so underlying RLS remains authoritative.

## Security checklist

- Never commit `.env`, service-role keys, API secrets or SMTP credentials.
- Rotate any credential that was previously committed to Git history.
- Keep admin access protected by Supabase Auth + role checks + RLS.
- Add `https://admin.cyphertech.co.zw/**` to Supabase Auth allowed redirect URLs where required by the selected email/password recovery flow.
- Keep the admin hostname out of search indexing.
