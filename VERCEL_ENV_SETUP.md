# Vercel Environment Variables Setup

## ⚠️ IMPORTANT: Set These in Vercel Dashboard

For your production deployment to work, you MUST add these environment variables in Vercel dashboard.

## Steps to Add in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`mb-adminside` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

### Variable 1:
- **Name:** `BACKBLAZE_KEY_ID`
- **Value:** `fcf60303e564`
- **Environments:** ✅ Production ✅ Preview ✅ Development

### Variable 2:
- **Name:** `BACKBLAZE_APPLICATION_KEY`
- **Value:** `003491de578627b190adb4d23dad769aa47dbe70ef`
- **Environments:** ✅ Production ✅ Preview ✅ Development

### Variable 3:
- **Name:** `BACKBLAZE_BUCKET_NAME`
- **Value:** `MaalovBK`
- **Environments:** ✅ Production ✅ Preview ✅ Development

### Variable 4:
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres`
- **Environments:** ✅ Production ✅ Preview ✅ Development

5. Click **Save** for each variable
6. **Redeploy** your project:
   - Go to **Deployments**
   - Click ⋯ (three dots) on latest deployment
   - Click **Redeploy**

## After Redeploy:

Your Backblaze integration should now work! Test by:
1. Opening your app
2. Going to Cloud Files section
3. You should see files from Backblaze (or empty list if no files exist)

## Local Development:

If you're running the app locally, you need to:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Create a `.env` file** in the project root with:
   ```env
   BACKBLAZE_KEY_ID=fcf60303e564
   BACKBLAZE_APPLICATION_KEY=003491de578627b190adb4d23dad769aa47dbe70ef
   BACKBLAZE_BUCKET_NAME=MaalovBK
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres
   ```

3. **Run with Vercel CLI** (not `npm run dev`):
   ```bash
   vercel dev
   ```
   
   This is required because the API routes (`/api/*`) are Vercel serverless functions that need the Vercel runtime to access environment variables.

## Troubleshooting:

### Error: "Backblaze credentials not configured"

**If running in production (Vercel):**
1. ✅ Check that all 4 environment variables are set in Vercel dashboard
2. ✅ Make sure you selected all environments (Production, Preview, Development) for each variable
3. ✅ **Redeploy** your project after adding variables (they don't apply to existing deployments)
4. ✅ Check Vercel deployment logs to see if variables are being read

**If running locally:**
1. ✅ Make sure `.env` file exists in project root
2. ✅ Use `vercel dev` instead of `npm run dev`
3. ✅ Restart `vercel dev` after creating/updating `.env` file

### How to Check if Variables are Set:

In Vercel dashboard:
1. Go to **Deployments** → Click on latest deployment
2. Go to **Functions** tab → Click on `api/list-backblaze-files`
3. Check **Logs** - you should see environment check output showing which variables are present

## Security Note:

✅ `.env` file is in `.gitignore` - credentials won't be committed
✅ Local `.env` is only for development
✅ Production uses Vercel environment variables (secure)
