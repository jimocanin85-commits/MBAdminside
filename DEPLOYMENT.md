# Deployment Guide for MBAdminside

This guide covers multiple ways to deploy your project so it can be accessed externally.

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

**Steps:**
1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click "Add New Project"
3. Import your repository: `jimocanin85-commits/MBAdminside`
4. Vercel will auto-detect Vite settings
5. Add environment variables (if needed):
   - `BACKBLAZE_KEY_ID` - Backblaze B2 Key ID (required for file storage)
   - `BACKBLAZE_APPLICATION_KEY` - Backblaze B2 Application Key (required for file storage)
   - `BACKBLAZE_BUCKET_NAME` - Backblaze B2 Bucket Name (required for file storage)
   - `DATABASE_URL` - Neon PostgreSQL connection string (optional, for database features)
6. Click "Deploy"

**Note:** See [BACKBLAZE_SETUP.md](./BACKBLAZE_SETUP.md) for detailed Backblaze setup instructions.

**Result:** Your site will be live at `https://mbadminside.vercel.app` (or your custom domain)

---

### Option 2: Netlify

**Steps:**
1. Go to [netlify.com](https://netlify.com) and sign up/login with GitHub
2. Click "Add new site" → "Import an existing project"
3. Select your repository: `jimocanin85-commits/MBAdminside`
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Site settings → Environment variables
6. Click "Deploy site"

**Result:** Your site will be live at `https://random-name.netlify.app`

---

### Option 3: Cloudflare Pages

**Steps:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select GitHub and authorize
4. Select repository: `jimocanin85-commits/MBAdminside`
5. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Add environment variables
7. Click "Save and Deploy"

**Result:** Your site will be live at `https://mbadminside.pages.dev`

---

### Option 4: GitHub Pages

**Steps:**
1. Build the project:
   ```bash
   npm run build
   ```

2. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Add to `package.json` scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

5. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: Deploy from a branch → `gh-pages` branch

**Result:** Your site will be live at `https://jimocanin85-commits.github.io/MBAdminside`

---

## Manual Build & Deploy

If you want to deploy manually to any hosting service:

1. **Build the project:**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with production-ready files.

2. **Upload the `dist` folder** to your hosting service:
   - Shared hosting: Upload via FTP
   - VPS: Copy files to web server directory (nginx/apache)
   - Any static hosting: Upload the `dist` folder contents

---

## Environment Variables

Make sure to set these environment variables in your hosting platform:

### Required for File Storage (Backblaze B2)
- `BACKBLAZE_KEY_ID` - Your Backblaze B2 Key ID
- `BACKBLAZE_APPLICATION_KEY` - Your Backblaze B2 Application Key  
- `BACKBLAZE_BUCKET_NAME` - Your Backblaze B2 Bucket Name

### Optional (for database features)
- `DATABASE_URL` - Neon PostgreSQL connection string

**See [BACKBLAZE_SETUP.md](./BACKBLAZE_SETUP.md) for detailed setup instructions.**

---

## Custom Domain

All platforms above support custom domains:
- Vercel: Settings → Domains
- Netlify: Domain settings → Add custom domain
- Cloudflare: Custom domains → Add domain
- GitHub Pages: Settings → Pages → Custom domain

---

## Recommended: Vercel

Vercel is recommended because:
- ✅ Free tier with generous limits
- ✅ Automatic deployments on git push
- ✅ Fast global CDN
- ✅ Easy environment variable management
- ✅ Custom domains included
- ✅ SSL certificates automatic

