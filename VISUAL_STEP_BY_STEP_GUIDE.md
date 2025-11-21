# Visual Step-by-Step Guide: Step 4 Onwards

## Step 4: Initialize Database Schema

### What You'll See and Do (With Visual Descriptions)

---

### Step 4.1: Open Neon Dashboard

**What to do:**
1. Go to **https://console.neon.tech**
2. Log in if needed

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Neon Dashboard                                  │
│                                                  │
│  [Projects] [SQL Editor] [Settings] [Monitor]   │
│                                                  │
│  Your Projects:                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📁 mb-adminside                          │  │
│  │    Created: Today                        │  │
│  │    [Open Project]                        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Action:** Click on your project name (e.g., "mb-adminside")

---

### Step 4.2: Navigate to SQL Editor

**What you'll see after clicking your project:**
```
┌─────────────────────────────────────────────────┐
│  mb-adminside                                    │
│                                                  │
│  LEFT SIDEBAR:                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📊 Dashboard                              │  │
│  │ 💾 Tables                                  │  │
│  │ 📝 SQL Editor        ← CLICK THIS ONE     │  │
│  │ ⚙️  Settings                               │  │
│  │ 📈 Monitor                                 │  │
│  │ 🔗 Branches                                │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  MAIN AREA:                                     │
│  [Project overview content]                     │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"SQL Editor"** in the left sidebar

---

### Step 4.3: Open SQL Editor

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  SQL Editor                                     │
│                                                  │
│  TOP BAR:                                       │
│  [New Query] [Save] [Run] [Format]            │
│                                                  │
│  EDITOR AREA (Large empty box):                │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │  (Empty - this is where you paste SQL)   │  │
│  │                                           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  RESULTS AREA (Below editor, empty for now):   │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"New Query"** button (or the editor area is already ready)

---

### Step 4.4: Get the SQL Code

**What to do:**
1. Open your project files (in VS Code, Cursor, or file explorer)
2. Navigate to: `src/integrations/database/schema.sql`
3. Open that file

**What you'll see in the file:**
```sql
-- MBadmin Database Schema for Neon PostgreSQL

-- Trainers table
CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  navn VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(50),
  foedselsdato DATE NOT NULL,
  aargang VARCHAR(50),
  rolle VARCHAR(100),
  kontaktperson VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  excel_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_trainers_navn ON trainers(navn);
CREATE INDEX IF NOT EXISTS idx_trainers_created_at ON trainers(created_at DESC);

-- Frivilligfest checklist table
CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklist_updated_at 
ON frivilligfest_checklist(updated_at DESC);

-- Users table (for future authentication/authorization)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default users (if not exists)
INSERT INTO users (username, role) 
VALUES 
  ('admin', 'admin'),
  ('Karina', 'restricted'),
  ('Brian', 'limited')
ON CONFLICT (username) DO NOTHING;
```

**Action:** 
1. Select **ALL** the text (Ctrl+A or Cmd+A)
2. Copy it (Ctrl+C or Cmd+C)

---

### Step 4.5: Paste into SQL Editor

**What to do:**
1. Go back to Neon SQL Editor (in browser)
2. Click inside the editor area (the big empty box)
3. Paste the SQL code (Ctrl+V or Cmd+V)

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  SQL Editor                                     │
│                                                  │
│  TOP BAR:                                       │
│  [New Query] [Save] [▶ Run] [Format]          │
│                                                  │
│  EDITOR AREA (Now filled with SQL):           │
│  ┌───────────────────────────────────────────┐  │
│  │ -- MBadmin Database Schema...             │  │
│  │                                           │  │
│  │ CREATE TABLE IF NOT EXISTS trainers (     │  │
│  │   id SERIAL PRIMARY KEY,                  │  │
│  │   navn VARCHAR(255) NOT NULL,             │  │
│  │   ...                                     │  │
│  │ );                                        │  │
│  │                                           │  │
│  │ CREATE TABLE IF NOT EXISTS...            │  │
│  │ ... (all your SQL code)                  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  RESULTS AREA (Still empty):                   │
└─────────────────────────────────────────────────┘
```

**Action:** Make sure all the SQL code is pasted (should be ~50 lines)

---

### Step 4.6: Run the SQL

**What to do:**
1. Look for the **"Run"** button (usually top right, might have a ▶ play icon)
2. Click it

**OR**

Press keyboard shortcut:
- **Windows/Linux:** `Ctrl + Enter`
- **Mac:** `Cmd + Enter`

**What you'll see after clicking Run:**
```
┌─────────────────────────────────────────────────┐
│  SQL Editor                                     │
│                                                  │
│  EDITOR AREA:                                   │
│  [Your SQL code still visible]                 │
│                                                  │
│  RESULTS AREA (Now shows results):             │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ Success                                │  │
│  │                                            │  │
│  │ Query executed successfully                │  │
│  │                                            │  │
│  │ Rows affected: 3                           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**OR** you might see:
```
✅ Query executed successfully
```

**Expected Result:** ✅ **Success** message

---

### Step 4.7: Verify Tables Were Created

**What to do:**
1. Look at the **left sidebar** in Neon
2. Click **"Tables"**

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  LEFT SIDEBAR:                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📊 Dashboard                              │  │
│  │ 💾 Tables        ← YOU ARE HERE           │  │
│  │ 📝 SQL Editor                              │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  MAIN AREA:                                     │
│  ┌───────────────────────────────────────────┐  │
│  │ Tables in your database:                   │  │
│  │                                            │  │
│  │ ✅ trainers                                │  │
│  │ ✅ frivilligfest_checklist                 │  │
│  │ ✅ users                                   │  │
│  │                                            │  │
│  │ (3 tables total)                          │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Expected:** You should see 3 tables listed:
- ✅ `trainers`
- ✅ `frivilligfest_checklist`
- ✅ `users`

**✅ Step 4 Complete!** Tables are created.

---

## Step 5: Deploy to Vercel

### Step 5.1: Open Vercel Dashboard

**What to do:**
1. Go to **https://vercel.com/dashboard**
2. Log in if needed

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Vercel Dashboard                                │
│                                                  │
│  TOP NAVIGATION:                                │
│  [Dashboard] [Projects] [Team] [Settings]      │
│                                                  │
│  YOUR PROJECTS:                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 📁 MBAdminside (or your project name)     │  │
│  │    Last deployed: 2 hours ago            │  │
│  │    [Open]                                 │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Action:** Click on your project name

---

### Step 5.2: Go to Deployments Tab

**What you'll see after clicking project:**
```
┌─────────────────────────────────────────────────┐
│  MBAdminside                                     │
│                                                  │
│  TOP TABS:                                      │
│  [Overview] [Deployments] [Settings] [Analytics]│
│     ↑                                            │
│  (You're here)                                   │
│                                                  │
│  MAIN AREA:                                     │
│  [Project overview content]                     │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"Deployments"** tab at the top

---

### Step 5.3: View Deployments List

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Deployments                                     │
│                                                  │
│  LIST OF DEPLOYMENTS:                           │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ Ready    main    abc123  2 hours ago   │  │
│  │              [Visit] [•••]                │  │
│  │                                            │  │
│  │ ✅ Ready    main    def456  1 day ago     │  │
│  │              [Visit] [•••]                │  │
│  │                                            │  │
│  │ ✅ Ready    main    ghi789  2 days ago    │  │
│  │              [Visit] [•••]                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Action:** Find the **latest deployment** (top of list) and click the **"..."** (three dots) menu

---

### Step 5.4: Redeploy

**What you'll see after clicking "..." (three dots):**
```
┌─────────────────────────────────────────────────┐
│  Dropdown Menu:                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📋 Copy Deployment URL                    │  │
│  │ 🔄 Redeploy          ← CLICK THIS         │  │
│  │ 🗑️  Delete                                │  │
│  │ 📊 View Function Logs                      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"Redeploy"**

---

### Step 5.5: Confirm Redeploy

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Confirm Redeploy                                │
│                                                  │
│  Are you sure you want to redeploy?             │
│                                                  │
│  [Cancel]  [Redeploy]  ← CLICK THIS            │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"Redeploy"** button

---

### Step 5.6: Watch Deployment Progress

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Deployments                                     │
│                                                  │
│  NEW DEPLOYMENT (at top):                       │
│  ┌───────────────────────────────────────────┐  │
│  │ ⏳ Building    main    xyz999  just now   │  │
│  │                                            │  │
│  │ Status: Building...                        │  │
│  │ [View Logs]                                │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  (Wait 2-3 minutes)                             │
└─────────────────────────────────────────────────┘
```

**What happens:**
1. Status changes: **"Queued"** → **"Building"** → **"Ready"**
2. Takes about 2-3 minutes
3. You can click "View Logs" to see progress

**After 2-3 minutes, you'll see:**
```
┌─────────────────────────────────────────────────┐
│  ✅ Ready    main    xyz999  1 minute ago      │
│     [Visit] [•••]                               │
└─────────────────────────────────────────────────┘
```

**✅ Step 5 Complete!** Deployment is ready.

---

## Step 6: Test Everything

### Step 6.1: Test Database Connection

**What to do:**
1. Go back to **Neon Dashboard** → Your project
2. Click **"SQL Editor"**
3. Type this query:
   ```sql
   SELECT COUNT(*) FROM trainers;
   ```
4. Click **"Run"**

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  SQL Editor                                     │
│                                                  │
│  QUERY:                                         │
│  SELECT COUNT(*) FROM trainers;                 │
│                                                  │
│  RESULTS:                                       │
│  ┌───────────────────────────────────────────┐  │
│  │ count                                      │  │
│  │ ───────                                    │  │
│  │     0                                      │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ✅ Query executed successfully                 │
└─────────────────────────────────────────────────┘
```

**Expected:** Should return `0` (table exists, just empty)

**✅ Database connected!**

---

### Step 6.2: Test Checklist in Your App

**What to do:**
1. Open your app URL (from Vercel deployment - click "Visit" button)
2. Log in

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Your App - MBadmin                             │
│                                                  │
│  [Login Form]                                   │
│  Username: [________]                           │
│  Password: [________]                           │
│  [Log ind]                                      │
└─────────────────────────────────────────────────┘
```

**Action:** Log in with your credentials

---

**After logging in, you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Dashboard                                       │
│                                                  │
│  [Frivilligfest2026]  [Other buttons]          │
│                                                  │
│  (Main dashboard content)                       │
└─────────────────────────────────────────────────┘
```

**Action:** Click **"Frivilligfest2026"** button

---

**Dialog opens:**
```
┌─────────────────────────────────────────────────┐
│  Frivilligfest 2026                    [X]      │
│                                                  │
│  Opgaver:                                       │
│  ┌───────────────────────────────────────────┐  │
│  │ DJ                    [Udført] [Tildelt] │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Tilføj ny opgave:                              │
│  [________________] [Tilføj opgave]            │
│                                                  │
│  [Opdater]                                      │
└─────────────────────────────────────────────────┘
```

**Action:**
1. Type a task name in the input field (e.g., "Test Task")
2. Click **"Tilføj opgave"** (Add task)
3. Task should appear in the list
4. Check the **"Udført"** checkbox
5. **Refresh the page** (F5 or reload button)

**Expected:** Task should still be there after refresh ✅

---

### Step 6.3: Verify Checklist Data in Database

**What to do:**
1. Go back to **Neon Dashboard** → SQL Editor
2. Run this query:
   ```sql
   SELECT * FROM frivilligfest_checklist;
   ```

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  RESULTS:                                       │
│  ┌───────────────────────────────────────────┐  │
│  │ id │ data                                 │  │
│  │ ───┼──────────────────────────────────────│  │
│  │  1 │ {"items":[...], "checklist":{...}}  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ✅ Query executed successfully                 │
└─────────────────────────────────────────────────┘
```

**Expected:** Should show your checklist data (JSON format)

**✅ Checklist saving to database!**

---

### Step 6.4: Test Trainers in Your App

**What to do:**
1. In your app, click **"Frivillig"** dropdown → **"Opret"** (Create)

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Opret Træner                          [X]      │
│                                                  │
│  Navn:        [________________]                │
│  Email:       [________________]                │
│  Telefon:     [________________]                │
│  Fødselsdato: [____/____/____]                  │
│  Årgang:      [________________]                │
│  Rolle:       [________________]                │
│  Kontaktperson: [________________]              │
│                                                  │
│  [Gem]  [Annuller]                              │
└─────────────────────────────────────────────────┘
```

**Action:**
1. Fill in the form:
   - Navn: "Test Trainer"
   - Email: "test@test.com"
   - Telefon: "12345678"
   - Fødselsdato: Pick any date
   - Fill other fields
2. Click **"Gem"** (Save)
3. **Refresh the page** (F5)

**Expected:** Trainer should still be in the list ✅

---

### Step 6.5: Verify Trainer Data in Database

**What to do:**
1. Go to **Neon Dashboard** → SQL Editor
2. Run:
   ```sql
   SELECT * FROM trainers;
   ```

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  RESULTS:                                       │
│  ┌───────────────────────────────────────────┐  │
│  │ id │ navn         │ email        │ ...   │  │
│  │ ───┼──────────────┼──────────────┼───────│  │
│  │  1 │ Test Trainer │ test@test... │ ...   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ✅ Query executed successfully                 │
└─────────────────────────────────────────────────┘
```

**Expected:** Should show your trainer data

**✅ Trainers saving to database!**

---

### Step 6.6: Check for Errors

**What to do:**
1. In your app, press **F12** (opens Developer Tools)
2. Click **"Console"** tab

**What you'll see:**
```
┌─────────────────────────────────────────────────┐
│  Console                                        │
│                                                  │
│  (No errors - clean console)                   │
│                                                  │
│  ✅ Good! No red errors                         │
└─────────────────────────────────────────────────┘
```

**OR** if there are errors:
```
┌─────────────────────────────────────────────────┐
│  Console                                        │
│                                                  │
│  ❌ Error: DATABASE_URL not configured          │
│  (Red text)                                     │
└─────────────────────────────────────────────────┘
```

**Expected:** No red errors ✅

---

## ✅ Final Checklist

After completing all steps:

- [ ] ✅ Step 4: Tables created in Neon (trainers, frivilligfest_checklist, users)
- [ ] ✅ Step 5: Vercel deployment successful (status: Ready)
- [ ] ✅ Step 6.1: Database connection works (SELECT query returns 0)
- [ ] ✅ Step 6.2: Checklist persists after refresh
- [ ] ✅ Step 6.3: Checklist data visible in database
- [ ] ✅ Step 6.4: Trainers persist after refresh
- [ ] ✅ Step 6.5: Trainer data visible in database
- [ ] ✅ Step 6.6: No errors in browser console

---

## 🎉 Success!

If all checkboxes are checked:
- ✅ Database is connected
- ✅ Data persists
- ✅ Everything works

**Your migration is complete!** 🎊

---

## 🆘 Troubleshooting

### If Step 4 fails:
- Check you copied ALL the SQL code
- Make sure you clicked "Run"
- Check for error messages in results area

### If Step 5 fails:
- Check Vercel deployment logs
- Make sure DATABASE_URL is set in environment variables
- Try redeploying again

### If Step 6 fails:
- Check browser console (F12) for errors
- Verify DATABASE_URL is set in Vercel
- Check Neon dashboard → Monitor for connection issues

---

**That's it!** Follow these visual descriptions step by step. 🚀
