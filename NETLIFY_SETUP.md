# Netlify Setup Guide

This guide explains how to configure your application for deployment on Netlify.

## Environment Variables

Set the following environment variables in Netlify dashboard → Site settings → Environment variables:

### Required Variables

1. **DATABASE_URL**
   - Value: `postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres`
   - Replace `[YOUR_PASSWORD]` with your actual database password
   - Scope: All scopes (Production, Deploy previews, Branch deploys)

2. **BACKBLAZE_KEY_ID**
   - Value: `fcf60303e564`
   - Scope: All scopes

3. **BACKBLAZE_APPLICATION_KEY**
   - Value: `003491de578627b190adb4d23dad769aa47dbe70ef`
   - Scope: All scopes

4. **BACKBLAZE_BUCKET_NAME**
   - Value: `MaalovBK`
   - Scope: All scopes

## Steps to Configure

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** for each variable above
5. Make sure to select all scopes for each variable
6. Click **Save variable**

## After Configuration

1. Trigger a new deployment:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Or push a new commit to your repository

2. Verify the deployment:
   - Check the build logs for any errors
   - Test your API endpoints at `/api/*`
   - Verify database connectivity

## Local Development

For local development, create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ymrzdjwgadbktuvkuntl.supabase.co:5432/postgres
BACKBLAZE_KEY_ID=fcf60303e564
BACKBLAZE_APPLICATION_KEY=003491de578627b190adb4d23dad769aa47dbe70ef
BACKBLAZE_BUCKET_NAME=MaalovBK
```

**IMPORTANT:** Add `.env` to `.gitignore` to avoid committing credentials!

## Troubleshooting

### Functions Not Working

- Check that `netlify.toml` is configured correctly
- Verify environment variables are set in Netlify
- Check function logs in Netlify dashboard → Functions tab

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Check that the database password is correct
- Ensure the database is accessible from Netlify's IP ranges

### Backblaze Issues

- Verify all three Backblaze environment variables are set
- Check Backblaze credentials are correct
- Review function logs for detailed error messages
