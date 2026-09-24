/**
 * Password Migration Script
 *
 * Run this ONCE after deploying the auth security fixes. Before this fix,
 * custom_users.password was stored in plain text. api/login.ts and
 * api/users.ts now only ever write bcrypt hashes to that column, and
 * verifyPassword() rejects anything that isn't already a bcrypt hash
 * (hashes always start with "$2") - so any row still holding a plaintext
 * password will fail to log in until this script has run.
 *
 * What it does:
 *   - Reads every row in custom_users
 *   - Skips rows whose password already looks like a bcrypt hash
 *   - Hashes anything else and writes it back
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/hash-existing-passwords.ts
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, not the anon key - once Row Level
 * Security is enabled (see supabase/migrations/0001_enable_rls.sql), the
 * anon key can no longer read or write custom_users at all.
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function looksHashed(password: string | null | undefined): boolean {
  // bcrypt hashes always start with $2a$, $2b$ or $2y$
  return !!password && password.startsWith('$2');
}

async function main() {
  console.log('Fetching custom_users...');
  const { data: users, error } = await supabase
    .from('custom_users')
    .select('id, username, password');

  if (error) {
    console.error('❌ Failed to fetch users:', error.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users found - nothing to do.');
    return;
  }

  let migrated = 0;
  let alreadyHashed = 0;
  let failed = 0;

  for (const user of users) {
    if (looksHashed(user.password)) {
      alreadyHashed++;
      continue;
    }

    if (!user.password) {
      console.warn(`⚠️  User "${user.username}" has no password set - skipping.`);
      continue;
    }

    const hash = await bcrypt.hash(user.password, 10);
    const { error: updateError } = await supabase
      .from('custom_users')
      .update({ password: hash })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Failed to update "${user.username}":`, updateError.message);
      failed++;
      continue;
    }

    console.log(`✅ Hashed password for "${user.username}"`);
    migrated++;
  }

  console.log('\n--- Summary ---');
  console.log(`Already hashed: ${alreadyHashed}`);
  console.log(`Migrated:       ${migrated}`);
  console.log(`Failed:         ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
