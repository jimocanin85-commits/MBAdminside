# Database Migration Guide - Neon PostgreSQL (Free SQL Solution)

## Why Neon?

✅ **Free Tier**: 0.5 GB storage, unlimited projects  
✅ **Serverless PostgreSQL**: Auto-scaling, pay-per-use  
✅ **Vercel Integration**: Native integration with Vercel  
✅ **Cursor Friendly**: Excellent TypeScript support, easy setup  
✅ **PostgreSQL**: Industry-standard SQL database  
✅ **Branching**: Database branching for development (like git)  

## Alternative Options (Also Free)

### 1. **Turso** (SQLite-based)
- ✅ Very fast (edge-distributed)
- ✅ Free tier: 500 databases, 500 MB storage
- ✅ Great for smaller apps
- ⚠️ SQLite (not full PostgreSQL)

### 2. **Supabase** (PostgreSQL)
- ✅ Full PostgreSQL with extras (Auth, Storage)
- ✅ Free tier: 500 MB database
- ⚠️ You just migrated away from Supabase

### 3. **PlanetScale** (MySQL)
- ✅ MySQL-compatible
- ✅ Free tier: 5 GB storage
- ⚠️ MySQL (not PostgreSQL)

## Recommended: Neon PostgreSQL

### Step 1: Create Neon Account

1. Go to https://neon.tech
2. Sign up with GitHub (recommended for Cursor integration)
3. Create a new project
4. Copy your connection string (looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)

### Step 2: Set Environment Variables in Vercel

Add to Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Step 3: Install Dependencies

```bash
npm install @neondatabase/serverless
```

### Step 4: Database Schema

We'll create a table for the checklist:

```sql
CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_updated_at ON frivilligfest_checklist(updated_at DESC);
```

### Step 5: Update API Routes

The API routes will be updated to use Neon instead of in-memory storage.

## Migration Steps

1. ✅ Create Neon account and project
2. ✅ Set `DATABASE_URL` in Vercel
3. ✅ Install `@neondatabase/serverless`
4. ✅ Create database schema
5. ✅ Update API routes
6. ✅ Test and deploy

## Benefits Over In-Memory Storage

- ✅ **Persistent**: Data survives function restarts
- ✅ **Cross-device sync**: Works across all devices
- ✅ **Scalable**: Handles concurrent requests
- ✅ **Queryable**: Can query and filter data
- ✅ **Backup**: Automatic backups included
