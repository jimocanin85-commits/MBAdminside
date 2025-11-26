# Local Development Setup for Cloud Files

## Problem
The Cloud Files feature uses Vercel serverless functions (`/api/*` routes) which don't work with plain Vite dev server. You need to run a local API server alongside Vite.

## Solution: Run Local API Server

### Quick Start (Recommended)

1. **Start the API server** (in one terminal):
   ```bash
   npm run dev:api
   ```
   This starts the API server on `http://localhost:3001`

2. **Start the Vite dev server** (in another terminal):
   ```bash
   npm run dev
   ```
   This starts the frontend on `http://localhost:8080`

3. **Access your app**:
   - Frontend: `http://localhost:8080`
   - API routes are automatically proxied from `/api/*` to `http://localhost:3001/api/*`
   - Cloud Files should now work!

### Alternative: Use Vercel CLI

If you prefer using Vercel CLI:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Run the development server**:
   ```bash
   npm run dev:vercel
   ```
   Or directly:
   ```bash
   npx vercel dev
   ```

3. **Access your app**:
   - Vercel CLI will start both the frontend and API routes
   - Usually runs on `http://localhost:3000`

## Environment Variables

Make sure your `.env` file has:
```
BACKBLAZE_KEY_ID=fcf60303e564
BACKBLAZE_APPLICATION_KEY=003e15a176a8db76f398d174b569c33a75f48e55d6
BACKBLAZE_BUCKET_NAME=MaalovBK
```

Vercel CLI will automatically load these from your `.env` file.

## Troubleshooting

### API routes return 404
- Make sure you're using `npx vercel dev` or `npm run dev:vercel`
- Don't use plain `npm run dev` (Vite only) - it won't serve API routes

### Environment variables not loading
- Ensure `.env` file is in the project root
- Vercel CLI loads `.env` automatically
- Check that variables are set correctly

### Port conflicts
- Vercel CLI usually uses port 3000
- If port is in use, Vercel will prompt you to use a different port
- Update `vite.config.ts` proxy target if needed

## Quick Start

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Start dev server with API support
npm run dev:vercel
```

Then open your browser to the URL shown (usually http://localhost:3000) and Cloud Files should work!
