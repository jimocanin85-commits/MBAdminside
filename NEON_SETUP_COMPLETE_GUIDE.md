# Complete Neon Setup Guide - MBadmin Database Migration

This guide will walk you through setting up Neon PostgreSQL and migrating all MBadmin data.

## 📋 Prerequisites

- A GitHub account (recommended for Neon signup)
- Access to your Vercel project dashboard
- Your MBadmin application code (already in repository)

---

## Step 1: Create Neon Account & Project

### 1.1 Sign Up for Neon

1. Go to **https://neon.tech**
2. Click **"Sign Up"** or **"Get Started"**
3. Choose **"Sign in with GitHub"** (recommended) or use email
4. Authorize Neon to access your GitHub (if using GitHub)

### 1.2 Create a New Project

1. After signing in, you'll see the Neon dashboard
2. Click **"Create Project"** button
3. Fill in the project details:
   - **Project name**: `mb-adminside` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `US East (Ohio)` for US, `EU (Frankfurt)` for Europe)
   - **PostgreSQL version**: `15` (default is fine)
   - **Compute size**: `Free` (0.5 GB storage)
4. Click **"Create Project"**

### 1.3 Wait for Project Creation

- Neon will create your database (takes ~30 seconds)
- You'll see a success message when ready

---

## Step 2: Get Your Connection String

### 2.1 Find Connection Details

1. In your Neon project dashboard, look for **"Connection Details"** or **"Connection String"**
2. You'll see a connection string that looks like:
   ```
   postgresql://username:password@ep-xxxxx-xxxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Click **"Copy"** to copy the full connection string

### 2.2 Save Connection String Securely

- **Important**: Save this connection string somewhere safe
- You'll need it for Vercel environment variables
- Format: `postgresql://user:password@host/database?sslmode=require`

---

## Step 3: Set Up Environment Variable in Vercel

### 3.1 Access Vercel Dashboard

1. Go to **https://vercel.com/dashboard**
2. Sign in if needed
3. Find and click on your **MBadmin project**

### 3.2 Add Environment Variable

1. Click on **"Settings"** tab (top navigation)
2. Click **"Environment Variables"** in the left sidebar
3. Click **"Add New"** button

### 3.3 Configure DATABASE_URL

Fill in the form:
- **Key**: `DATABASE_URL`
- **Value**: Paste your Neon connection string (from Step 2)
- **Environment**: Select all three:
  - ✅ **Production**
  - ✅ **Preview**
  - ✅ **Development**

4. Click **"Save"**

### 3.4 Verify Environment Variable

- You should see `DATABASE_URL` listed in the environment variables table
- The value will be masked (shown as `••••••••`)

---

## Step 4: Initialize Database Schema

You have **two options** to initialize the database schema:

### Option A: Using Neon SQL Editor (Recommended - Easiest)

1. Go back to **Neon dashboard** → Your project
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Open the file `src/integrations/database/schema.sql` from your project
5. Copy **ALL** the SQL code from that file
6. Paste it into the Neon SQL Editor
7. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
8. You should see: ✅ **"Success"** message
9. Verify tables were created:
   - Click **"Tables"** in left sidebar
   - You should see: `trainers`, `frivilligfest_checklist`, `users`

### Option B: Using Command Line Script

1. Install Vercel CLI (if not installed):
   ```bash
   npm install -g vercel
   ```

2. Link to your project:
   ```bash
   vercel link
   ```
   - Select your project when prompted
   - Follow the prompts

3. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```
   - This downloads your `DATABASE_URL` to `.env.local`

4. Initialize database:
   ```bash
   npm run db:init
   ```
   - You should see: ✅ **"Complete database schema initialized"**

---

## Step 5: Deploy to Vercel

### 5.1 Trigger Deployment

The code is already in your repository. To deploy:

1. **Option A**: Push any change to trigger auto-deployment:
   ```bash
   git commit --allow-empty -m "Trigger deployment for Neon database"
   git push origin main
   ```

2. **Option B**: Go to Vercel dashboard → **"Deployments"** → Click **"Redeploy"** on latest deployment

### 5.2 Verify Deployment

1. Wait for deployment to complete (~2-3 minutes)
2. Check deployment logs for any errors
3. Your API routes should now be connected to Neon

---

## Step 6: Test Database Connection

### 6.1 Test via Browser Console

1. Open your deployed app (e.g., `https://your-app.vercel.app`)
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Create a trainer or update checklist
5. Check for any database errors in console

### 6.2 Test via Neon Dashboard

1. Go to Neon dashboard → Your project
2. Click **"SQL Editor"**
3. Run this query to check trainers:
   ```sql
   SELECT COUNT(*) FROM trainers;
   ```
4. Run this query to check checklist:
   ```sql
   SELECT COUNT(*) FROM frivilligfest_checklist;
   ```
5. If you see `0` or numbers, database is working! ✅

---

## Step 7: Migrate Existing Data (Optional)

If you have existing data in localStorage:

### 7.1 Migrate Trainers

1. Open your app in browser
2. Open Developer Tools → **Console**
3. Run this script:
   ```javascript
   // Get trainers from localStorage
   const trainersJson = localStorage.getItem('trainers');
   if (trainersJson) {
     const trainers = JSON.parse(trainersJson);
     console.log(`Found ${trainers.length} trainers to migrate`);
     
     // Migrate each trainer via API
     trainers.forEach(async (trainer) => {
       try {
         const response = await fetch('/api/trainers', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(trainer)
         });
         const result = await response.json();
         console.log(`✅ Migrated: ${trainer.navn}`, result);
       } catch (error) {
         console.error(`❌ Error migrating ${trainer.navn}:`, error);
       }
     });
   }
   ```

### 7.2 Migrate Checklist

The checklist will migrate automatically when you:
1. Open the Frivilligfest dialog
2. Make any change (add task, update status, etc.)
3. Data saves to database automatically

---

## Step 8: Verify Everything Works

### 8.1 Test Checklist

1. ✅ Open Frivilligfest dialog
2. ✅ Add a new task
3. ✅ Mark task as complete
4. ✅ Refresh page → Data should persist
5. ✅ Open on different device → Should sync

### 8.2 Test Trainers

1. ✅ Create a new trainer
2. ✅ Edit a trainer
3. ✅ Delete a trainer
4. ✅ Refresh page → Trainers should persist
5. ✅ Check Neon dashboard → See data in `trainers` table

---

## 🎉 Success Checklist

- [ ] Neon account created
- [ ] Project created in Neon
- [ ] Connection string copied
- [ ] `DATABASE_URL` set in Vercel
- [ ] Database schema initialized
- [ ] Deployment successful
- [ ] Database connection working
- [ ] Data persists after refresh
- [ ] Cross-device sync works

---

## 🔧 Troubleshooting

### Problem: "DATABASE_URL not configured"

**Solution:**
- Check Vercel environment variables
- Ensure `DATABASE_URL` is set for all environments
- Redeploy after adding environment variable

### Problem: "Table does not exist"

**Solution:**
- Run schema initialization (Step 4)
- Check Neon SQL Editor for errors
- Verify tables exist in Neon dashboard → Tables

### Problem: "Connection timeout"

**Solution:**
- Check Neon project is active (not paused)
- Verify connection string is correct
- Check region matches your Vercel deployment region

### Problem: "Data not syncing"

**Solution:**
- Check browser console for errors
- Verify API routes are deployed
- Check Neon dashboard → Monitor → See query logs
- Test API endpoint directly: `https://your-app.vercel.app/api/trainers`

### Problem: "Can't connect from local development"

**Solution:**
1. Create `.env.local` file in project root
2. Add: `DATABASE_URL=your_neon_connection_string`
3. Restart dev server: `npm run dev`

---

## 📚 Additional Resources

- **Neon Documentation**: https://neon.tech/docs
- **Neon Dashboard**: https://console.neon.tech
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **PostgreSQL Tutorial**: https://www.postgresql.org/docs/

---

## 💡 Tips

1. **Free Tier Limits**: 0.5 GB storage - enough for thousands of trainers
2. **Automatic Backups**: Neon backs up your data automatically
3. **Database Branching**: Create branches for testing (like git)
4. **Monitor Usage**: Check Neon dashboard → Monitor for query performance
5. **Keep Connection String Safe**: Never commit it to git (already in `.gitignore`)

---

## 🆘 Need Help?

1. Check Neon dashboard → **Support** or **Documentation**
2. Check Vercel deployment logs for errors
3. Check browser console for client-side errors
4. Verify all steps above were completed

---

## ✅ Next Steps After Setup

1. ✅ Test all features work with database
2. ✅ Verify data persists
3. ✅ Test cross-device sync
4. ✅ Monitor Neon dashboard for usage
5. ✅ (Optional) Remove localStorage fallback code later

---

**Congratulations!** 🎉 Your MBadmin database is now fully migrated to Neon PostgreSQL!
