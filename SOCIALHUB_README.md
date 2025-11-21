# SocialHub - Social Media Aggregation Platform

A comprehensive social media management platform that allows users to connect multiple social media accounts, view unified feeds, create and schedule posts, track analytics, and manage notifications across platforms.

## Features

### 🔐 Authentication
- Email/password sign up and login
- Google OAuth integration
- Secure authentication via Supabase Auth
- User profile management

### 📱 Social Media Integration
- Connect multiple platforms:
  - Instagram
  - X (Twitter)
  - TikTok
  - LinkedIn
  - Facebook
  - YouTube
- OAuth-based account connection
- Token management and refresh
- Account status monitoring

### 📝 Post Management
- Create posts with text, images, and videos
- Multi-platform posting
- Post scheduling with date/time picker
- Draft management
- Media upload to Supabase Storage
- Platform-specific previews

### 📊 Unified Feed
- View posts from all connected accounts in one feed
- Filter by platform and content type
- Search functionality
- Real-time updates
- Engagement metrics display

### 📈 Analytics Dashboard
- Total followers across platforms
- Post count and engagement metrics
- Engagement over time (line chart)
- Platform comparison (bar chart)
- Date range filtering
- Platform-specific analytics

### 🔔 Notifications
- Real-time notifications via Supabase subscriptions
- Filter by notification type (Like, Comment, Mention, Follow, Message)
- Read/unread status
- Mark all as read functionality

### ⚙️ Account & Settings
- View and manage connected accounts
- Disconnect/reconnect accounts
- Push notification preferences
- Profile management

### 🎨 UI/UX
- Modern, responsive design
- Dark mode support
- Mobile-friendly interface
- Smooth animations and transitions
- Accessible components

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

## Database Schema

The app uses Supabase PostgreSQL with the following tables:

### `users`
- Extends Supabase auth.users
- Stores user profile information

### `social_accounts`
- Stores OAuth tokens for connected platforms
- Platform-specific user information
- Token expiration tracking

### `posts`
- Post content and metadata
- Scheduling information
- Status tracking (draft/published/scheduled/failed)

### `interactions`
- Engagement metrics (likes, comments, shares, views)
- Linked to posts

### `notifications`
- User notifications
- Read/unread status
- Platform and type information

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Social media API credentials (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd socialhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `src/integrations/database/socialhub-schema.sql` in the Supabase SQL Editor
   - Create a storage bucket named `post-media` for media uploads
   - Enable Google OAuth provider in Supabase Auth settings

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── ui/            # Reusable UI components (shadcn/ui)
│   └── ThemeToggle.tsx
├── pages/
│   ├── auth/          # Auth pages (SignUp, Login, Onboarding)
│   ├── Welcome.tsx    # Landing page
│   ├── Home.tsx       # Unified feed
│   ├── CreatePost.tsx # Post creation
│   ├── Analytics.tsx  # Analytics dashboard
│   ├── Account.tsx    # Account settings
│   └── Notifications.tsx
├── integrations/
│   ├── supabase/      # Supabase client and types
│   └── database/      # Database schema
├── lib/
│   ├── social-media-apis.ts  # Platform API integrations
│   └── utils.ts
├── types/
│   └── socialhub.ts   # TypeScript types
└── App.tsx            # Main app component with routing
```

## Social Media API Integration

The app includes placeholder implementations for social media API integrations in `src/lib/social-media-apis.ts`. To enable actual posting:

1. **Get API credentials** from each platform:
   - Instagram: Facebook Developer Console
   - X: Twitter Developer Portal
   - TikTok: TikTok for Developers
   - LinkedIn: LinkedIn Developer Portal
   - Facebook: Facebook Developer Console
   - YouTube: Google Cloud Console

2. **Implement OAuth flows** for each platform
3. **Update API functions** in `social-media-apis.ts` with actual API calls
4. **Set up webhooks** for notifications (where supported)

## Features Roadmap

- [ ] AI-powered caption and hashtag suggestions (OpenAI integration)
- [ ] Bulk media upload
- [ ] Team management and multi-user accounts
- [ ] Advanced scheduling with recurring posts
- [ ] Content calendar view
- [ ] Export analytics reports
- [ ] Social listening and mentions tracking
- [ ] Competitor analysis
- [ ] Hashtag analytics

## Security Considerations

- All access tokens are stored encrypted in the database
- Row Level Security (RLS) policies protect user data
- OAuth tokens should be refreshed automatically
- Media uploads are stored securely in Supabase Storage
- Environment variables should never be committed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
