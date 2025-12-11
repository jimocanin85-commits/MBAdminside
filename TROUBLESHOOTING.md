# Troubleshooting: Cloud Files & Bestyrelsreferater Not Working

## Common Error: "Backblaze credentials not configured"

This error occurs when the API routes cannot access the Backblaze environment variables.

## Quick Fix Checklist

### ✅ If Running Locally (Development)

1. **Stop your current dev server** (if running `npm run dev`)

2. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

3. **Make sure `.env` file exists** in project root with:
   ```env
   BACKBLAZE_KEY_ID=fcf60303e564
   BACKBLAZE_APPLICATION_KEY=003491de578627b190adb4d23dad769aa47dbe70ef
   BACKBLAZE_BUCKET_NAME=MaalovBK
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres
   ```

4. **Run with Vercel CLI** (NOT `npm run dev`):
   ```bash
   vercel dev
   ```
   
   ⚠️ **Important**: The API routes (`/api/*`) are Vercel serverless functions. They only work with `vercel dev`, not with `npm run dev`.

5. **Test the configuration**:
   ```bash
   npx tsx scripts/test-backblaze-config.ts
   ```

### ✅ If Deployed to Vercel (Production)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Select your project** (`mb-adminside` or similar)

3. **Go to Settings → Environment Variables**

4. **Add/Verify these 4 variables** (make sure to select **Production**, **Preview**, AND **Development** for each):
   - `BACKBLAZE_KEY_ID` = `fcf60303e564`
   - `BACKBLAZE_APPLICATION_KEY` = `003491de578627b190adb4d23dad769aa47dbe70ef`
   - `BACKBLAZE_BUCKET_NAME` = `MaalovBK`
   - `DATABASE_URL` = `postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres`
     - ⚠️ Replace `[YOUR_PASSWORD]` with your actual database password

5. **Redeploy your project**:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**
   
   ⚠️ **Critical**: Environment variables only apply to NEW deployments. You MUST redeploy after adding/updating them.

6. **Verify the deployment**:
   - After redeploy completes, go to the deployment
   - Click **Functions** tab
   - Click on `api/list-backblaze-files`
   - Check **Logs** - you should see:
     ```
     Environment check: {
       hasKeyId: true,
       hasApplicationKey: true,
       hasBucketName: true,
       bucketName: 'MaalovBK'
     }
     ```

## Debugging Steps

### Check Browser Console

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Try to open Cloud Files or Bestyrelsreferater
5. Look for error messages - they will now show more detailed information

### Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Try to open Cloud Files
4. Look for request to `/api/list-backblaze-files`
5. Check the response:
   - **404**: API route not found (use `vercel dev` locally)
   - **500**: Check the response body for error details
   - **200 with error**: Environment variables not set (check Vercel dashboard)

### Test API Endpoint Directly

If running locally with `vercel dev`:
```bash
curl http://localhost:3000/api/list-backblaze-files
```

You should see a JSON response. If you see an error about missing credentials, check your `.env` file.

## Common Issues

### Issue 1: "Cannot connect to API" or 404 errors

**Cause**: Running `npm run dev` instead of `vercel dev`

**Solution**: Stop `npm run dev` and run `vercel dev` instead

### Issue 2: "Backblaze credentials not configured" (even after setting env vars)

**Cause**: Environment variables not set in Vercel, or not redeployed

**Solution**: 
1. Double-check all 4 variables are set in Vercel dashboard
2. Make sure you selected all 3 environments (Production, Preview, Development)
3. **Redeploy** the project

### Issue 3: Works locally but not in production

**Cause**: Environment variables only set locally, not in Vercel

**Solution**: Set environment variables in Vercel dashboard and redeploy

### Issue 4: Variables set but still getting errors

**Cause**: Wrong variable names or values

**Solution**: 
- Check variable names are exactly: `BACKBLAZE_KEY_ID`, `BACKBLAZE_APPLICATION_KEY`, `BACKBLAZE_BUCKET_NAME`
- Check bucket name is exactly: `MaalovBK` (case-sensitive)
- Check key IDs match what's in your `.env` file

## Still Not Working?

1. Check Vercel deployment logs for detailed error messages
2. Run the test script: `npx tsx scripts/test-backblaze-config.ts`
3. Verify your Backblaze B2 account has the correct bucket name `MaalovBK`
4. Check that your Backblaze Application Key has the correct permissions
