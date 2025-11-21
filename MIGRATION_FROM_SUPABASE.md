# Migration from Supabase to Vercel Serverless Functions

This document explains how to migrate from Supabase Edge Functions to Vercel Serverless Functions.

## What Changed

### Before (Supabase)
- Used Supabase Edge Functions (Deno runtime)
- Required Supabase project and Storage bucket
- Functions called via `supabase.functions.invoke()`

### After (Vercel)
- Uses Vercel Serverless Functions (Node.js runtime)
- No external service required (except Backblaze B2 for file storage)
- Functions called via `functions.invoke()` from API client

## Migration Steps

### 1. Environment Variables

**Remove these Supabase variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Keep these Backblaze variables (set in Vercel dashboard):**
- `BACKBLAZE_KEY_ID`
- `BACKBLAZE_APPLICATION_KEY`
- `BACKBLAZE_BUCKET_NAME`

**Optional (for custom API URL):**
- `VITE_API_BASE_URL` (defaults to `/api` for same-domain)

### 2. Vercel Configuration

The API routes are automatically deployed to Vercel when you push to your repository. Make sure your `vercel.json` includes:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": "vite"
}
```

### 3. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `BACKBLAZE_KEY_ID`
   - `BACKBLAZE_APPLICATION_KEY`
   - `BACKBLAZE_BUCKET_NAME`

### 4. Code Changes

All code has been updated. The main changes:

**Old:**
```typescript
import { supabase } from "@/integrations/supabase/client";
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... }
});
```

**New:**
```typescript
import { functions } from "@/integrations/api/client";
const { data, error } = await functions.invoke('function-name', {
  method: 'POST',
  body: { ... }
});
```

### 5. API Routes Created

The following API routes were created in `/api`:

- `/api/list-backblaze-files.ts` - List all files in Backblaze bucket
- `/api/download-backblaze-file.ts` - Download a file from Backblaze
- `/api/upload-to-backblaze.ts` - Upload a file to Backblaze
- `/api/delete-backblaze-file.ts` - Delete a file from Backblaze
- `/api/frivilligfest-checklist.ts` - Checklist sync (in-memory storage)

### 6. Local Development

For local development with Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

This will start the Vercel development server with API routes.

### 7. Deployment

Simply push to your repository. Vercel will automatically:
1. Build your frontend
2. Deploy API routes as serverless functions
3. Set up routing

## Benefits

1. **No External Service**: No need for Supabase account
2. **Simpler Setup**: Everything in one place (Vercel)
3. **Better Integration**: Native Vercel functions work seamlessly
4. **Cost**: Vercel's free tier includes generous serverless function limits

## Limitations

1. **Checklist Storage**: The `frivilligfest-checklist` function uses in-memory storage, which resets on function restart. For production, consider:
   - Vercel KV (Redis)
   - A database (PostgreSQL, MongoDB)
   - External storage service

2. **Cold Starts**: Serverless functions may have cold start delays (usually < 1 second)

## Troubleshooting

### Functions not found (404)
- Ensure API routes are in `/api` folder
- Check Vercel deployment logs
- Verify function names match exactly

### Environment variables not working
- Set variables in Vercel dashboard (not `.env` file for production)
- Redeploy after adding variables
- Check variable names match exactly

### CORS errors
- API routes include CORS headers
- Check browser console for specific errors
- Verify API base URL is correct

## Rollback Plan

If you need to rollback to Supabase:

1. Revert git commits
2. Restore Supabase environment variables
3. Redeploy

All Supabase Edge Functions are still in `/supabase/functions/` for reference.
