/**
 * Neon Database Client
 * Serverless PostgreSQL database for persistent storage
 */

import { neon } from '@neondatabase/serverless';

// Get DATABASE_URL from environment (works in Vercel serverless functions)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL not set - database features will be disabled');
}

// Create Neon client (works in both Node.js and Edge runtime)
// Neon automatically handles connection pooling and serverless optimization
export const sql = databaseUrl ? neon(databaseUrl) : null;

/**
 * Initialize database schema
 * Call this once to set up tables
 */
export async function initDatabase() {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  await sql`
    CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_updated_at 
    ON frivilligfest_checklist(updated_at DESC);
  `;

  console.log('Database schema initialized');
}

/**
 * Get the latest checklist data
 */
export async function getChecklistData() {
  if (!sql) {
    return null;
  }

  try {
    const result = await sql`
      SELECT data, updated_at 
      FROM frivilligfest_checklist 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;

    return result[0]?.data || null;
  } catch (error) {
    console.error('Error getting checklist data:', error);
    return null;
  }
}

/**
 * Save checklist data
 */
export async function saveChecklistData(data: any) {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    // Delete old records (keep only latest)
    await sql`DELETE FROM frivilligfest_checklist`;

    // Insert new record (Neon automatically serializes JavaScript objects to JSONB)
    await sql`
      INSERT INTO frivilligfest_checklist (data, updated_at)
      VALUES (${data}::jsonb, CURRENT_TIMESTAMP)
    `;

    return { success: true };
  } catch (error) {
    console.error('Error saving checklist data:', error);
    throw error;
  }
}
