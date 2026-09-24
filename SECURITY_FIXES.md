# Security Fixes — 2026-09-24

This documents the auth/security fixes applied on top of the original
codebase. Read this before deploying.

## What was wrong

1. `GET /api/users` returned every user's **plaintext password** to anyone
   who requested it — no authentication required.
2. No API route checked the caller was actually logged in; `isAuthenticated`
   only hid UI in the React app, it never gated the API.
3. The admin password was hardcoded in `LoginForm.tsx`, shipped straight
   into the client-side JavaScript bundle.
4. CORS was `Access-Control-Allow-Origin: *` on every route.
5. Password checks happened in the browser (comparing against a hardcoded
   object and the full user list fetched from the API).
6. `POST /api/sessions` (which creates a login session) didn't verify a
   password at all — a client could mint a session for any username.

## What changed

- **`api/_lib/auth.ts`** — shared, restricted CORS + session verification
  (`requireAuth`, `requireAdmin`) used by every route below.
- **`api/_lib/passwords.ts`** — bcrypt hash/verify. Passwords are hashed
  with bcrypt (10 salt rounds) wherever they're written.
- **`api/_lib/credentials.ts`** — shared credential check used by both
  `/api/login` and `/api/sessions`, so session creation can't be used to
  bypass login.
- **`api/login.ts`** (new) — server-side credential verification.
- **`api/users.ts`** — passwords/hashes are never included in any response;
  create/update/delete require an admin session.
- **`api/sessions.ts`** — session creation now requires and verifies a
  password; the admin-only "unlock" action is now actually enforced.
- **`api/trainers.ts`, `api/tasks.ts`, `api/layout.ts`,
  `api/send-notification.ts`, and all the Backblaze/referater/checklist
  routes** — CORS restricted, all now require a logged-in session.
- **`LoginForm.tsx`** — no more hardcoded password, no client-side password
  comparison, no fetching the full user list just to check a password.
- All frontend call sites that hit a now-protected route send the session
  token (`Authorization: Bearer <sessionId>`), either directly or
  automatically via `src/integrations/api/client.ts`.

## Deploy checklist (do these in order)

1. **Generate admin password hashes** and set them as env vars — do NOT
   put plaintext passwords anywhere:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
   ```
   Set the result as `ADMIN_PASSWORD_HASH` (for `admin`) and
   `BRIAN_PASSWORD_HASH` (for `Brian`) in Vercel → Settings → Environment
   Variables. **Pick new passwords while you're at it** — the old
   hardcoded one (`Monne1935`) was visible in the public GitHub repo and
   must be considered compromised.

2. **Set `ALLOWED_ORIGIN`** to your real domain(s), comma-separated, e.g.
   `https://mb-adminside.vercel.app,http://localhost:8080`.

3. **Install dependencies** (bcryptjs was added, and the old `bun.lockb`
   was removed since it no longer matches `package.json`):
   ```bash
   npm install
   ```

4. **Migrate existing users' passwords.** Any row already in `custom_users`
   still has a plaintext password and will fail to log in until you run:
   ```bash
   SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run migrate:hash-passwords
   ```
   (or `npx tsx scripts/hash-existing-passwords.ts` with the env vars set).
   This is safe to run more than once — it skips rows that are already
   hashed.

5. **Deploy**, then test login with each account type (admin, Brian, and at
   least one custom user) before considering this done.

## Known remaining gaps (not fixed in this pass)

- Rate limiting / brute-force protection on `/api/login` and
  `/api/sessions` — currently unlimited login attempts are allowed.
- The `custom_users.password` column name is misleading now that it holds
  a bcrypt hash, not a password. Left as-is to avoid a schema migration;
  consider renaming to `password_hash` later.
- No password complexity requirements on user creation/edit.
