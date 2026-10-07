# MBAdminside

Admin portal for Måløv Boldklub management system.

**Created by Jazzman**

## Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a service

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone https://github.com/jimocanin85-commits/MBAdminside.git
cd MBAdminside
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
   - Copy `.env` file and configure your Supabase credentials

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
├── public/          # Static assets
├── src/            # Source code
│   ├── components/ # React components
│   ├── pages/      # Page components
│   └── ...
├── supabase/       # Supabase configuration
└── ...
```

## How the app is organised

- `src/pages/` - one file per page (Forside, Frivillige, Filer, Årshjul, Referater, admin pages)
- `src/components/layout/` - the frame around every page: sidebar, bottom bar on phones, page header
- `src/context/AuthContext.tsx` - login, session and admin mode
- `src/context/PortalContext.tsx` - which sections are shown, and the club's own links
- `src/lib/api.ts` - `apiFetch()`, which adds the login token to every request
- `src/index.css` - the colour theme (light and dark). Change a colour there and it changes everywhere
- `api/` - serverless functions (Vercel)

## Admin mode

Admin mode unlocks "Tilpas portal" (choose which sections everyone sees, their order, and custom links),
deleting files, logs and - for the admin accounts - user management.

- The admin accounts (`admin`, `Brian`) switch it on from the user menu without a code.
- Other users need the admin code. It is verified on the server against `ADMIN_CODE_HASH`
  (see `.env.example`); if that variable is not set, only the admin accounts can use admin mode.
- The server enforces it: saving the layout and deleting files are rejected without admin mode.

## Who may do what

Access is checked on the server, not just hidden in the menu:

| Section (ticked off per user under "Brugere") | Server routes it opens |
|---|---|
| `frivillig` | volunteers' spreadsheets in `Frivillige/`: list, open, upload |
| `referater` | minutes in `Referater/<year>/`: list, open, upload |
| `aarshjul` | tasks and task notifications |

Deleting a file also needs admin mode. Uploads are only accepted into those two folders.
The rules live in `api/_lib/auth.ts` (`requirePermission`) and `api/_lib/files.ts`.

## Checks before every deployment

- `npm run check:functions` fails when `api/` holds more serverless functions than Vercel's plan
  allows (12). It runs automatically before `npm run build`. Shared code belongs in `api/_lib/`,
  which does not count.
- `npm run typecheck` type-checks the app and the API.
- `.github/workflows/ci.yml` runs both, plus the build, on every pull request and on every change
  to `main`. A red result means the site would not deploy.

Never write keys or passwords into a file in this repository, not even in a guide or a test
script. They go in Vercel → Settings → Environment Variables (see `.env.example` for the names).

## Deployment

Build the project for production:

```sh
npm run build
```

The `dist` folder will contain the production-ready files that can be deployed to any static hosting service.
