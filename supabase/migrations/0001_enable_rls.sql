-- Enable Row Level Security on every table reachable through the public
-- Supabase anon key.
--
-- Why this is needed: this app implements its own session/auth system
-- (api/_lib/auth.ts, api/sessions.ts) instead of using Supabase Auth, so
-- there is no Supabase JWT to write per-user RLS policies against. Without
-- RLS, anyone holding the anon key can read/write these tables directly
-- via Supabase's REST API (e.g. GET https://<project>.supabase.co/rest/v1/custom_users),
-- completely bypassing the Vercel API routes and every auth check in
-- api/_lib/auth.ts. The anon key is meant to be public (it ships in
-- client JS bundles) and this repo's history has previously exposed real
-- env values, so it must be treated as already leaked.
--
-- The fix: api/_lib/supabaseAdmin.ts now uses SUPABASE_SERVICE_ROLE_KEY
-- (a server-only secret, never shipped to the browser) for every
-- server-side query. The service_role key bypasses RLS by design, so no
-- policies need to be defined for it. With RLS enabled and no policies
-- granted below, the anon/authenticated roles get denied by default.
--
-- Run this once in the Supabase SQL editor for this project, and set
-- SUPABASE_SERVICE_ROLE_KEY in Vercel (Settings -> Environment Variables,
-- value from Supabase Settings -> API -> service_role) BEFORE or
-- immediately after running this - the API will fail closed (start
-- returning errors instead of data) for any request made with the old
-- anon key until that env var is set.

alter table public.custom_users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.aarshjul_tasks enable row level security;
alter table public.app_settings enable row level security;

-- No policies are created for anon/authenticated roles on purpose - the
-- default with RLS enabled and zero policies is "deny all", which is what
-- we want: only the service_role key (used exclusively by api/*.ts) can
-- read or write these tables.
