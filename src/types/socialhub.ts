// SocialHub TypeScript Types

export type Platform = 'Instagram' | 'X' | 'TikTok' | 'LinkedIn' | 'Facebook' | 'YouTube';

export type ContentType = 'text' | 'image' | 'video';

export type PostStatus = 'draft' | 'published' | 'scheduled' | 'failed';

export type NotificationType = 'Like' | 'Comment' | 'Mention' | 'Follow' | 'Message';

export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  platform_user_id?: string;
  platform_username?: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  platform: Platform;
  content_type: ContentType;
  content_url?: string;
  text?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  platform_post_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  post_id: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read_status: boolean;
  platform?: Platform;
  related_post_id?: string;
  created_at: string;
}

export interface PostWithInteraction extends Post {
  interaction?: Interaction;
  social_account?: SocialAccount;
}

export interface PlatformConfig {
  name: Platform;
  icon: string;
  color: string;
  enabled: boolean;
}
