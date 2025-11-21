# Neon PostgreSQL Setup Guide

## Quick Start

### 1. Create Neon Account

1. Visit https://neon.tech
2. Click "Sign Up" → Sign in with GitHub (recommended)
3. Click "Create Project"
4. Choose a name (e.g., "mb-adminside")
5. Select a region (closest to your users)
6. Click "Create Project"

### 2. Get Connection String

1. In your Neon project dashboard, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### 3. Set Environment Variable in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project → **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### 4. Initialize Database Schema

After setting `DATABASE_URL` in Vercel, you can initialize the database:

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Initialize database
npm run db:init
```

**Option B: Using Neon SQL Editor**
1. Go to Neon dashboard → SQL Editor
2. Run this SQL:
```sql
CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_updated_at 
ON frivilligfest_checklist(updated_at DESC);
```

### 5. Deploy

Push your changes to trigger a new deployment:

```bash
git add .
git commit -m "Add Neon PostgreSQL database integration"
git push
```

Vercel will automatically:
- Install dependencies (`@neondatabase/serverless`)
- Deploy API routes with database support
- Use the `DATABASE_URL` environment variable

## Testing

After deployment, test the checklist:
1. Open your app
2. Create a task in Frivilligfest checklist
3. Check Neon dashboard → Tables → `frivilligfest_checklist` to see the data

## Neon Dashboard Features

- **SQL Editor**: Run queries directly
- **Branches**: Create database branches (like git branches)
- **Metrics**: Monitor queries and performance
- **Backups**: Automatic backups included

## Free Tier Limits

- ✅ **0.5 GB** storage
- ✅ **Unlimited** projects
- ✅ **Unlimited** API requests
- ✅ **Automatic** backups
- ✅ **99.9%** uptime SLA

## Troubleshooting

### "DATABASE_URL not configured"
- Check environment variable is set in Vercel
- Redeploy after adding environment variable

### Connection timeout
- Check Neon project is active (not paused)
- Verify connection string is correct
- Check region matches your Vercel deployment

### Schema errors
- Run `npm run db:init` locally with `DATABASE_URL` set
- Or use Neon SQL Editor to create tables manually

## Migration from In-Memory Storage

The checklist will automatically migrate:
- First GET request loads from database (or returns null)
- First POST request saves to database
- All subsequent requests use database

No data migration needed - users will start fresh with database storage.
