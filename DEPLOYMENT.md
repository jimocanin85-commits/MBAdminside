# Deployment

The portal runs on **Vercel**. Nothing else is used.

It has to be Vercel (or another host that can run the functions in `api/`): login, users, the
årshjul and the file storage all go through those functions. A plain static host - Netlify,
Cloudflare Pages, GitHub Pages, an FTP upload of `dist/` - would show the login page and nothing
would work behind it.

## How a change goes live

1. A pull request gets its own preview address from Vercel, and GitHub runs the checks in
   `.github/workflows/ci.yml` (function count, type check, build).
2. Merging to `main` deploys to production.

A red check means the site would not deploy. See "Checks before every deployment" in `README.md`.

## Settings in Vercel

Set under **Settings → Environment Variables**, for **Production and Preview**. `.env.example`
lists every one with an explanation.

| Needed for | Variables |
|---|---|
| Login and data | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, `BRIAN_PASSWORD_HASH`, `ALLOWED_ORIGIN` |
| File storage | `BACKBLAZE_KEY_ID`, `BACKBLAZE_APPLICATION_KEY`, `BACKBLAZE_BUCKET_NAME` |
| Admin code for ordinary users (optional) | `ADMIN_CODE_HASH` |
| Task mails (optional) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` |

A changed variable only takes effect after a new deployment (Deployments → Redeploy).

- First-time setup and the security checklist: `SECURITY_FIXES.md`
- File storage, and how to check that it works: `BACKBLAZE_SETUP.md`

## Limits to know about

- Vercel's Hobby plan allows 12 serverless functions per deployment. `npm run check:functions`
  guards this; shared code goes in `api/_lib/`, which does not count.
- A request to a function may be at most 4.5 MB, so files up to about 3 MB can be stored.

## Netlify

Netlify is not used. If a Netlify site is still connected to the repository it will keep building
a preview for every pull request; those previews cannot log in (no `api/`). To stop them, delete
the site in Netlify, or remove Netlify under GitHub → Settings → Applications.
