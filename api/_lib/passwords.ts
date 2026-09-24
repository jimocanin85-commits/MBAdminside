/**
 * Password hashing helpers (bcrypt). Used by api/login.ts and api/users.ts
 * so passwords are never stored or compared as plaintext.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  // Existing rows created before this fix may still hold plaintext passwords.
  // bcrypt hashes always start with "$2"; anything else is legacy plaintext,
  // which we reject here — run scripts/hash-existing-passwords.ts once to
  // migrate old rows instead of silently accepting plaintext forever.
  if (!hash.startsWith('$2')) return false;
  return bcrypt.compare(plain, hash);
}
