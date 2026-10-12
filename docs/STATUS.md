# Status (2026-10-12)

## Working
- Live site: https://unison-kohl.vercel.app (Vercel project `unison`, root `apps/web`).
- Auth gate: anonymous `/app` redirects to `/login`; password and magic-link sign-in work.
- Supabase project `unison-production` (dskjtdqtkfifqdydnnvf): full schema, RLS on all tables,
  table grants for `authenticated`/`service_role` (migration 20261012180000), one org + owner user.

## Open
- `SupabaseRepository` does not implement everything the demo repository does
  (e.g. `createInvitation` -> "is not a function"). Audit demo vs Supabase repo and implement the gaps.
- Vercel `SUPABASE_SERVICE_ROLE_KEY` still needs the unison-production key (set in Vercel UI only).
- Supabase Auth URL config: Site URL `https://unison-kohl.vercel.app`, redirect `/auth/callback`.
- Delete old empty Supabase project `supabase-cerise-arrow` and the old Vercel Supabase integration.
- Repo is public; make private if intended.
- Undecided: keep this TypeScript project (recommended) vs. a fresh project / Python.
