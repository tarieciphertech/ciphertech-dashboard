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

## Security checklist

- Never commit `.env`, service-role keys, API secrets or SMTP credentials.
- Rotate any credential that was previously committed to Git history.
- Keep admin access protected by Supabase Auth + role checks + RLS.
- Add `https://admin.cyphertech.co.zw/**` to Supabase Auth allowed redirect URLs where required by the selected email/password recovery flow.
- Keep the admin hostname out of search indexing.
