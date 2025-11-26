# Backblaze B2 Quick Start

## Quick Configuration Steps

### 1. Get Backblaze Credentials

1. Sign up at [backblaze.com/b2](https://www.backblaze.com/b2/sign-up.html)
2. Create a bucket (note the bucket name)
3. Create an Application Key with these permissions:
   - ✅ Allow List Buckets
   - ✅ Allow Read Buckets  
   - ✅ Allow Write Buckets
   - ✅ Allow Read Files
   - ✅ Allow Delete Files
4. Copy your **Key ID** and **Application Key**

### 2. Set Environment Variables

**Local Development:**
```bash
# Create .env file from template
cp .env.example .env

# Edit .env and add:
BACKBLAZE_KEY_ID=your_key_id_here
BACKBLAZE_APPLICATION_KEY=your_application_key_here
BACKBLAZE_BUCKET_NAME=your_bucket_name_here
```

**Vercel Deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all three variables for Production, Preview, and Development
3. Redeploy your application

### 3. Test Configuration

```bash
npm run test:backblaze
```

This will verify:
- ✅ Environment variables are set
- ✅ Backblaze authorization works
- ✅ Bucket access is correct
- ✅ File listing works

### 4. Use Cloud Files

Once configured, Cloud Files will automatically:
- ✅ List all `.xlsx` files from your Backblaze bucket
- ✅ Allow viewing/editing files
- ✅ Upload new trainer files
- ✅ Delete files (with password protection)

## Troubleshooting

**"Backblaze credentials not configured"**
→ Check your `.env` file or Vercel environment variables

**"Bucket not found"**
→ Verify bucket name matches exactly (case-sensitive)

**"Authorization failed"**
→ Double-check your Key ID and Application Key

**Files not showing**
→ Ensure files are `.xlsx` format and not hidden (starting with `.`)

## Full Documentation

See [BACKBLAZE_SETUP.md](./BACKBLAZE_SETUP.md) for detailed instructions.
