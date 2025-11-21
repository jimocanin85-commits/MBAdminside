# Step 4: Initialize Database Schema

## What This Does
Creates the database tables needed for your app:
- `trainers` - Stores trainer data
- `frivilligfest_checklist` - Stores checklist data  
- `users` - Stores user accounts

## Method 1: Using Neon SQL Editor (Easiest) ⭐ Recommended

### Step-by-Step:

1. **Go to Neon Dashboard**
   - Open https://console.neon.tech
   - Log in
   - Click on your project

2. **Open SQL Editor**
   - Look at the **left sidebar**
   - Click **"SQL Editor"**
   - You'll see a code editor area

3. **Get the SQL Code**
   - Open file: `src/integrations/database/schema.sql` from your project
   - **Copy ALL the code** from that file
   - It should start with `-- MBadmin Database Schema...`
   - It should end with `ON CONFLICT (username) DO NOTHING;`

4. **Paste into SQL Editor**
   - Click in the SQL Editor area
   - Paste the code you copied
   - You should see all the SQL commands

5. **Run the SQL**
   - Click the **"Run"** button (usually at top right)
   - Or press `Ctrl+Enter` (Windows) or `Cmd+Enter` (Mac)
   - Wait a few seconds

6. **Check for Success**
   - You should see: ✅ **"Success"** or **"Query executed successfully"**
   - If you see errors, check what they say

7. **Verify Tables Were Created**
   - In left sidebar, click **"Tables"**
   - You should see 3 tables:
     - ✅ `trainers`
     - ✅ `frivilligfest_checklist`
     - ✅ `users`

**✅ Done!** Your database schema is initialized.

---

## Method 2: Using Command Line

### Prerequisites:
- Node.js installed
- Terminal/Command Prompt access

### Steps:

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to your project folder**:
   ```bash
   cd /path/to/your/project
   ```

3. **Link to Vercel project**:
   ```bash
   vercel link
   ```
   - Select your project when asked
   - Follow the prompts

4. **Pull environment variables**:
   ```bash
   vercel env pull .env.local
   ```
   - This downloads your `DATABASE_URL` to `.env.local`

5. **Initialize database**:
   ```bash
   npm run db:init
   ```
   - You should see: ✅ **"Complete database schema initialized"**

**✅ Done!**

---

## What If It Fails?

### Error: "Table already exists"
- **Good!** Tables are already created
- You can skip this step

### Error: "Connection failed"
- Check your `DATABASE_URL` is correct
- Make sure Neon project is active (not paused)
- Try Method 1 instead (SQL Editor)

### Error: "Permission denied"
- Make sure you're using the correct connection string
- Check you have access to the Neon project

### Other Errors
- Copy the error message
- Check Neon documentation
- Or try Method 1 (SQL Editor) instead

---

## Quick Test

After initializing, test it:

1. Go to Neon → SQL Editor
2. Run:
   ```sql
   SELECT COUNT(*) FROM trainers;
   ```
3. Should return: `0` (table exists, just empty)

If you see `0`, it worked! ✅

---

**Once Step 4 is done, move to Step 5 (Deploy)!**
