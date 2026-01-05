# Supabase Setup Guide

This guide explains how to set up Supabase for user management and Årshjul tasks so data syncs across all devices (desktop and mobile).

## Step 1: Create the Tables in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Paste the following SQL and click **Run**:

```sql
-- =====================================================
-- USERS TABLE - For user management
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_users (
  id TEXT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_users_username ON custom_users(username);
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON custom_users(email);

ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on custom_users" ON custom_users
  FOR ALL USING (true) WITH CHECK (true);

-- If you already have the table, add the email column:
-- ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- =====================================================
-- ÅRSHJUL TASKS TABLE - For year wheel task management
-- =====================================================
CREATE TABLE IF NOT EXISTS aarshjul_tasks (
  id TEXT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subtasks JSONB DEFAULT '[]',
  assigned_users TEXT[] DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aarshjul_tasks_year ON aarshjul_tasks(year);
CREATE INDEX IF NOT EXISTS idx_aarshjul_tasks_month ON aarshjul_tasks(month);

ALTER TABLE aarshjul_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on aarshjul_tasks" ON aarshjul_tasks
  FOR ALL USING (true) WITH CHECK (true);
```

## Step 2: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API keys)

## Step 3: Configure Vercel Environment Variables

1. Go to your Vercel dashboard: https://vercel.com
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon public key |
| `SUPABASE_URL` | Your Supabase Project URL (same as above) |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key (same as above) |

5. Click **Save**
6. **Redeploy** your project for changes to take effect

## Step 4: Set Up Email Notifications with Maileroo

To enable email notifications when tasks are assigned in Årshjul:

### 1. Set Up Your Domain in Maileroo
1. Log in to https://app.maileroo.com
2. Go to **Sending Domains**
3. Add your domain and verify it by adding the DNS records Maileroo provides

### 2. Get SMTP Credentials
1. In Maileroo, go to **Sending Domains** → Click your domain
2. Click **SMTP Credentials** or **Generate SMTP Credentials**
3. Note down:
   - SMTP Host: `smtp.maileroo.com`
   - Port: `587` (TLS)
   - Username: Your SMTP username
   - Password: Your SMTP password

### 3. Add Environment Variables in Vercel

Go to Vercel → Your Project → **Settings** → **Environment Variables** and add:

| Name | Value |
|------|-------|
| `SMTP_HOST` | `smtp.maileroo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Maileroo SMTP username |
| `SMTP_PASS` | Your Maileroo SMTP password |
| `SMTP_FROM_EMAIL` | `noreply@your-verified-domain.com` |
| `SMTP_FROM_NAME` | `Måløv Boldklub` |

### 4. Redeploy
After adding the variables, redeploy your project for changes to take effect.

## Step 4: Test the Setup

1. Open your app on desktop
2. Go to Admin → User Management
3. Create a new user
4. Open your app on mobile
5. Go to Admin → User Management
6. The user you created should appear! 🎉

## How It Works

- When you create/edit/delete users, they are saved to Supabase
- Both desktop and mobile fetch users from the same Supabase database
- localStorage is used as a fallback if Supabase is unavailable
- The UI shows "Cloud" badge when connected to Supabase

## Troubleshooting

### Users not syncing?

1. Check that all 4 environment variables are set in Vercel
2. Make sure you redeployed after adding the variables
3. Open browser console (F12) and check for errors

### "Supabase not configured" error?

The environment variables are not set or not readable. Double-check:
- Variable names are exactly as shown above
- Values don't have extra spaces
- You clicked Save and redeployed

### Permission errors in Supabase?

Make sure you ran the RLS policy SQL:
```sql
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON custom_users
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Security Notes

The current setup allows anyone with the anon key to read/write users. For production:

1. Consider adding authentication
2. Restrict the RLS policies to authenticated users only
3. Hash passwords before storing (current implementation stores plain text for simplicity)

## Local Development

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Then run `npm run dev` to test locally.
