# Complete MBadmin Database Migration to Neon

This guide covers migrating **all** MBadmin data from localStorage to Neon PostgreSQL.

## What Gets Migrated

✅ **Trainers** - All trainer records  
✅ **Checklist** - Frivilligfest checklist data  
✅ **Users** - User accounts (admin, Karina, Brian)  

## Database Schema

### Tables Created

1. **trainers** - Trainer records
   - id (SERIAL PRIMARY KEY)
   - navn, email, telefon, foedselsdato, aargang, rolle, kontaktperson
   - created_at, updated_at
   - excel_data (JSONB)

2. **frivilligfest_checklist** - Checklist data
   - id (SERIAL PRIMARY KEY)
   - data (JSONB)
   - updated_at

3. **users** - User accounts
   - id (SERIAL PRIMARY KEY)
   - username, password_hash, role
   - created_at, last_login

## Migration Steps

### Step 1: Set Up Neon Database

1. Go to https://neon.tech
2. Create account and project
3. Copy connection string
4. Add to Vercel: `DATABASE_URL`

### Step 2: Initialize Database Schema

**Option A: Using SQL Editor (Recommended)**
1. Go to Neon dashboard → SQL Editor
2. Copy contents of `src/integrations/database/schema.sql`
3. Paste and run

**Option B: Using Script**
```bash
npm run db:init
```

### Step 3: Migrate Existing Data

**For Trainers:**
The app will automatically migrate trainers when you:
1. Open the app
2. Create/edit a trainer
3. Data saves to database automatically

**For Checklist:**
The checklist automatically uses the database. Existing localStorage data will be used as fallback until database has data.

**Manual Migration (Optional):**
If you want to migrate all localStorage data at once, you can run a browser console script (see migration script comments).

### Step 4: Update Components

All components have been updated to use the database API:
- ✅ `AdminPortal.tsx` - Uses `/api/trainers`
- ✅ `FrivilligfestDialog.tsx` - Uses `/api/frivilligfest-checklist`
- ✅ `TrainerForm.tsx` - Saves to database
- ✅ `TrainerSpreadsheet.tsx` - Loads from database
- ✅ `CloudFiles.tsx` - Trainer deletion uses database

## API Endpoints

### Trainers API (`/api/trainers`)

- `GET /api/trainers` - Get all trainers
- `GET /api/trainers?id=123` - Get single trainer
- `POST /api/trainers` - Create trainer
- `PUT /api/trainers?id=123` - Update trainer
- `DELETE /api/trainers?id=123` - Delete trainer

### Checklist API (`/api/frivilligfest-checklist`)

- `GET /api/frivilligfest-checklist` - Get checklist data
- `POST /api/frivilligfest-checklist` - Save checklist data

## Benefits

✅ **Persistent Storage** - Data survives browser clears  
✅ **Cross-Device Sync** - Works on all devices  
✅ **Scalable** - Handles concurrent users  
✅ **Queryable** - SQL queries for reports  
✅ **Backed Up** - Automatic Neon backups  
✅ **No localStorage Limits** - No 5-10MB storage limit  

## Rollback Plan

If needed, you can temporarily fall back to localStorage by:
1. Removing `DATABASE_URL` from Vercel
2. Components will fall back to localStorage automatically

## Verification

After migration:
1. ✅ Check Neon dashboard → Tables → See data
2. ✅ Create a trainer → Verify in database
3. ✅ Update checklist → Verify in database
4. ✅ Test on multiple devices → Verify sync

## Troubleshooting

### "DATABASE_URL not configured"
- Set `DATABASE_URL` in Vercel environment variables
- Redeploy after adding

### "Table does not exist"
- Run schema initialization (Step 2)
- Check Neon SQL Editor for errors

### Data not syncing
- Check API routes are deployed
- Check browser console for errors
- Verify `DATABASE_URL` is set correctly

### Trainers not showing
- Check `/api/trainers` endpoint works
- Verify database has data
- Check component is calling API correctly
