# SocialHub Setup Guide

## Quick Start

### 1. Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Schema**
   - Open Supabase SQL Editor
   - Copy contents from `src/integrations/database/socialhub-schema.sql`
   - Paste and execute in SQL Editor

3. **Create Storage Bucket**
   - Go to Storage in Supabase dashboard
   - Create a new bucket named `post-media`
   - Set it to public (or configure RLS policies)

4. **Enable Google OAuth** (Optional)
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your OAuth credentials

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Database Schema Overview

The app uses the following tables:

- **users**: User profiles (extends Supabase auth.users)
- **social_accounts**: Connected social media accounts with OAuth tokens
- **posts**: Posts created/scheduled by users
- **interactions**: Engagement metrics (likes, comments, shares, views)
- **notifications**: User notifications from platforms

All tables have Row Level Security (RLS) enabled to protect user data.

## Social Media API Integration

The app includes placeholder implementations for social media APIs. To enable actual posting:

1. **Get API Credentials** from each platform's developer portal
2. **Implement OAuth Flows** in `src/lib/social-media-apis.ts`
3. **Update API Functions** with actual API endpoints
4. **Set up Webhooks** for notifications (where supported)

### Platform-Specific Setup

#### Instagram
- Requires Facebook Developer Account
- Use Instagram Graph API
- Requires Business/Creator account

#### X (Twitter)
- Apply for Twitter Developer Account
- Use Twitter API v2
- Requires elevated access for posting

#### TikTok
- Apply for TikTok for Developers
- Use TikTok Content API
- Requires business account

#### LinkedIn
- Create LinkedIn Developer App
- Use LinkedIn API v2
- Requires company page for some features

#### Facebook
- Create Facebook Developer App
- Use Facebook Graph API
- Requires app review for production

#### YouTube
- Create Google Cloud Project
- Enable YouTube Data API v3
- Use OAuth 2.0 for authentication

## Testing

1. **Sign Up**: Create a new account
2. **Connect Accounts**: Go through onboarding to connect social accounts (mock for now)
3. **Create Post**: Create a post with text/media
4. **View Feed**: See posts in unified feed
5. **Analytics**: View analytics dashboard
6. **Notifications**: Check notifications screen

## Production Deployment

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel/Netlify**:
   - Connect your repository
   - Add environment variables
   - Deploy

3. **Update OAuth Redirect URLs**:
   - Add production URL to each platform's OAuth settings
   - Update Supabase redirect URLs

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and key are correct
- Check RLS policies are set up correctly
- Ensure tables exist in database

### Authentication Issues
- Check Supabase Auth settings
- Verify email templates are configured
- Check OAuth provider settings

### Storage Issues
- Verify bucket exists and is accessible
- Check RLS policies on storage bucket
- Ensure file size limits are appropriate

## Next Steps

- Implement actual social media API integrations
- Set up scheduled post processing (cron jobs)
- Add webhook endpoints for notifications
- Implement token refresh logic
- Add error handling and retry logic
