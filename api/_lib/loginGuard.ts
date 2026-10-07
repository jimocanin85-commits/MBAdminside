/**
 * Slows down password guessing.
 *
 * Login used to accept unlimited attempts. Now failed attempts are counted
 * and further attempts are refused for a while:
 *
 *  - 8 wrong passwords for the same user from the same address  -> locked
 *  - 40 wrong passwords for the same user from anywhere         -> locked
 *
 * ...each within 15 minutes, after which the count starts over. The first
 * rule stops someone guessing from one place without letting them lock the
 * real user out from elsewhere; the second caps guessing spread over many
 * addresses.
 *
 * Counts are kept in `app_settings` so they hold across serverless
 * instances. If that table is unavailable, counting falls back to this
 * instance's memory - weaker, but never a reason to refuse a correct login.
 */
import type { VercelRequest } from '@vercel/node';
import { deleteSetting, deleteStaleSettings, getSetting, setSetting } from './settings.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ADDRESS = 8;
const MAX_PER_USER = 40;

interface Attempts {
  count: number;
  firstAt: number;
}

const memory = new Map<string, Attempts>();

function clientAddress(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim();
  return first || 'unknown';
}

function keysFor(req: VercelRequest, username: string): { address: string; user: string } {
  const name = username.trim().toLowerCase().slice(0, 100);
  return {
    address: `login_attempts:${name}|${clientAddress(req)}`,
    user: `login_attempts:${name}`,
  };
}

async function read(key: string): Promise<Attempts | null> {
  const stored = (await getSetting<Attempts>(key)) || memory.get(key) || null;
  if (!stored || typeof stored.count !== 'number' || typeof stored.firstAt !== 'number') return null;
  if (Date.now() - stored.firstAt > WINDOW_MS) return null;
  return stored;
}

async function bump(key: string): Promise<void> {
  const current = await read(key);
  const next: Attempts = current ? { count: current.count + 1, firstAt: current.firstAt } : { count: 1, firstAt: Date.now() };
  memory.set(key, next);
  await setSetting(key, next);
}

/** Minutes until the next attempt is allowed, or 0 when login may proceed. */
export async function loginLockedMinutes(req: VercelRequest, username: string): Promise<number> {
  const keys = keysFor(req, username);
  const [byAddress, byUser] = await Promise.all([read(keys.address), read(keys.user)]);

  const blocking = [
    byAddress && byAddress.count >= MAX_PER_ADDRESS ? byAddress : null,
    byUser && byUser.count >= MAX_PER_USER ? byUser : null,
  ].filter((entry): entry is Attempts => entry !== null);
  if (blocking.length === 0) return 0;

  const releaseAt = Math.max(...blocking.map((entry) => entry.firstAt + WINDOW_MS));
  return Math.max(1, Math.ceil((releaseAt - Date.now()) / 60000));
}

export async function recordLoginFailure(req: VercelRequest, username: string): Promise<void> {
  const keys = keysFor(req, username);
  await Promise.all([bump(keys.address), bump(keys.user)]);
  // Counts that have run out are no longer used; clear them away so the
  // table does not grow with every mistyped name.
  await deleteStaleSettings('login_attempts:', new Date(Date.now() - WINDOW_MS));
}

/** A correct login from this address clears its own count. */
export async function clearLoginFailures(req: VercelRequest, username: string): Promise<void> {
  const { address } = keysFor(req, username);
  memory.delete(address);
  await deleteSetting(address);
}
