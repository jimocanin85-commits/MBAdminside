# Quick Start: Neon Setup (5 Minutes)

## 🚀 Fast Setup Guide

### 1. Create Neon Account (1 min)
- Go to https://neon.tech
- Sign up with GitHub
- Create project: `mb-adminside`
- Choose region closest to you

### 2. Get Connection String (30 sec)
- Click "Connection Details" in Neon dashboard
- Copy the connection string
- Format: `postgresql://user:pass@host/db?sslmode=require`

### 3. Add to Vercel (1 min)
- Go to Vercel → Your Project → Settings → Environment Variables
- Add: `DATABASE_URL` = (paste connection string)
- Select: Production, Preview, Development
- Save

### 4. Initialize Schema (1 min)
- Go to Neon → SQL Editor
- Copy/paste contents of `src/integrations/database/schema.sql`
- Click "Run"
- ✅ Done!

### 5. Deploy (1 min)
- Push to git or redeploy in Vercel
- Wait for deployment
- ✅ Database is live!

---

## ✅ Verify It Works

1. Open your app
2. Create a trainer or update checklist
3. Check Neon dashboard → Tables → See your data!

---

## 🆘 Quick Troubleshooting

**"DATABASE_URL not configured"**
→ Add it in Vercel environment variables and redeploy

**"Table does not exist"**
→ Run schema.sql in Neon SQL Editor

**"Connection timeout"**
→ Check Neon project is active (not paused)

---

**That's it!** Your database is ready. 🎉
