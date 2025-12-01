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
- **Value:** `0032cce8f9a80a34e1a4dfb6293880a86c20112d58`
- **Environments:** ✅ Production ✅ Preview ✅ Development

### Variable 3:
- **Name:** `BACKBLAZE_BUCKET_NAME`
- **Value:** `MaalovBK`
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

## Security Note:

✅ `.env` file is in `.gitignore` - credentials won't be committed
✅ Local `.env` is only for development
✅ Production uses Vercel environment variables (secure)
