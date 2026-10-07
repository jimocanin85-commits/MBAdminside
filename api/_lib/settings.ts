/**
 * Small shared key/value store on the existing `app_settings` table
 * (key TEXT UNIQUE, value JSONB, updated_at). The portal layout already
 * lives there; this lets other server code keep a value without a new
 * table. Every function tolerates the table being absent.
 */
import { supabaseAdmin as supabase } from './supabaseAdmin.js';

/** Notification addresses of the admin accounts: { admin: "...", Brian: "..." }. */
export const SYSTEM_EMAILS_KEY = 'system_user_emails';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSetting<T = any>(key: string): Promise<T | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return data.value as T;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored. */
export async function setSetting(key: string, value: unknown): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSetting(key: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('app_settings').delete().eq('key', key);
  } catch {
    // Nothing to clean up.
  }
}

/** Removes values whose key starts with `prefix` and that were last written before `olderThan`. */
export async function deleteStaleSettings(prefix: string, olderThan: Date): Promise<void> {
  if (!supabase || !prefix) return;
  try {
    await supabase
      .from('app_settings')
      .delete()
      .like('key', `${prefix}%`)
      .lt('updated_at', olderThan.toISOString());
  } catch {
    // Old values are harmless; they are ignored when read.
  }
}
