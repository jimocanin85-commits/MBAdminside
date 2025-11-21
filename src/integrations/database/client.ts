/**
 * Neon Database Client
 * Serverless PostgreSQL database for persistent storage
 * Complete MBadmin database migration
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
 * Initialize complete database schema
 * Call this once to set up all tables
 */
export async function initDatabase() {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  // Trainers table
  await sql`
    CREATE TABLE IF NOT EXISTS trainers (
      id SERIAL PRIMARY KEY,
      navn VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      telefon VARCHAR(50),
      foedselsdato DATE NOT NULL,
      aargang VARCHAR(50),
      rolle VARCHAR(100),
      kontaktperson VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      excel_data JSONB
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_trainers_navn ON trainers(navn);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_trainers_created_at ON trainers(created_at DESC);
  `;

  // Frivilligfest checklist table
  await sql`
    CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_checklist_updated_at 
    ON frivilligfest_checklist(updated_at DESC);
  `;

  // Users table (for future use)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `;

  // Insert default users (if not exists)
  await sql`
    INSERT INTO users (username, role) 
    VALUES 
      ('admin', 'admin'),
      ('Karina', 'restricted'),
      ('Brian', 'limited')
    ON CONFLICT (username) DO NOTHING;
  `;

  console.log('✅ Complete database schema initialized');
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

// ============================================================================
// TRAINERS DATABASE FUNCTIONS
// ============================================================================

export interface Trainer {
  id?: number;
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date | string;
  aargang: string;
  rolle: string;
  kontaktperson: string;
  createdAt?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  excelData?: any;
  excel_data?: any;
}

/**
 * Get all trainers
 */
export async function getAllTrainers(): Promise<Trainer[]> {
  if (!sql) {
    return [];
  }

  try {
    const result = await sql`
      SELECT 
        id,
        navn,
        email,
        telefon,
        foedselsdato,
        aargang,
        rolle,
        kontaktperson,
        created_at,
        updated_at,
        excel_data
      FROM trainers
      ORDER BY created_at DESC
    `;

    return result.map((row: any) => ({
      id: row.id,
      navn: row.navn,
      email: row.email || '',
      telefon: row.telefon || '',
      foedselsdato: new Date(row.foedselsdato),
      aargang: row.aargang || '',
      rolle: row.rolle || '',
      kontaktperson: row.kontaktperson || '',
      createdAt: new Date(row.created_at),
      excelData: row.excel_data || null
    }));
  } catch (error) {
    console.error('Error getting trainers:', error);
    return [];
  }
}

/**
 * Get trainer by ID
 */
export async function getTrainerById(id: number): Promise<Trainer | null> {
  if (!sql) {
    return null;
  }

  try {
    const result = await sql`
      SELECT * FROM trainers WHERE id = ${id}
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      navn: row.navn,
      email: row.email || '',
      telefon: row.telefon || '',
      foedselsdato: new Date(row.foedselsdato),
      aargang: row.aargang || '',
      rolle: row.rolle || '',
      kontaktperson: row.kontaktperson || '',
      createdAt: new Date(row.created_at),
      excelData: row.excel_data || null
    };
  } catch (error) {
    console.error('Error getting trainer:', error);
    return null;
  }
}

/**
 * Create a new trainer
 */
export async function createTrainer(trainer: Trainer): Promise<Trainer> {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    const result = await sql`
      INSERT INTO trainers (
        navn, email, telefon, foedselsdato, aargang, rolle, kontaktperson, excel_data
      )
      VALUES (
        ${trainer.navn},
        ${trainer.email || null},
        ${trainer.telefon || null},
        ${trainer.foedselsdato instanceof Date ? trainer.foedselsdato.toISOString().split('T')[0] : trainer.foedselsdato},
        ${trainer.aargang || null},
        ${trainer.rolle || null},
        ${trainer.kontaktperson || null},
        ${trainer.excelData ? JSON.stringify(trainer.excelData) : null}::jsonb
      )
      RETURNING *
    `;

    const row = result[0];
    return {
      id: row.id,
      navn: row.navn,
      email: row.email || '',
      telefon: row.telefon || '',
      foedselsdato: new Date(row.foedselsdato),
      aargang: row.aargang || '',
      rolle: row.rolle || '',
      kontaktperson: row.kontaktperson || '',
      createdAt: new Date(row.created_at),
      excelData: row.excel_data || null
    };
  } catch (error) {
    console.error('Error creating trainer:', error);
    throw error;
  }
}

/**
 * Update a trainer
 */
export async function updateTrainer(id: number, trainer: Partial<Trainer>): Promise<Trainer | null> {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    // Get existing trainer first
    const existing = await getTrainerById(id);
    if (!existing) {
      return null;
    }

    // Merge updates with existing data
    const updated: Trainer = {
      ...existing,
      ...trainer,
      id: existing.id
    };

    // Update using full record (simpler for Neon)
    const result = await sql`
      UPDATE trainers 
      SET 
        navn = ${updated.navn},
        email = ${updated.email || null},
        telefon = ${updated.telefon || null},
        foedselsdato = ${updated.foedselsdato instanceof Date ? updated.foedselsdato.toISOString().split('T')[0] : updated.foedselsdato},
        aargang = ${updated.aargang || null},
        rolle = ${updated.rolle || null},
        kontaktperson = ${updated.kontaktperson || null},
        excel_data = ${updated.excelData ? JSON.stringify(updated.excelData) : null}::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      navn: row.navn,
      email: row.email || '',
      telefon: row.telefon || '',
      foedselsdato: new Date(row.foedselsdato),
      aargang: row.aargang || '',
      rolle: row.rolle || '',
      kontaktperson: row.kontaktperson || '',
      createdAt: new Date(row.created_at),
      excelData: row.excel_data || null
    };
  } catch (error) {
    console.error('Error updating trainer:', error);
    throw error;
  }
}

/**
 * Delete a trainer
 */
export async function deleteTrainer(id: number): Promise<boolean> {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    const result = await sql`
      DELETE FROM trainers WHERE id = ${id}
    `;

    return true;
  } catch (error) {
    console.error('Error deleting trainer:', error);
    throw error;
  }
}

/**
 * Delete all trainers
 */
export async function deleteAllTrainers(): Promise<boolean> {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    await sql`DELETE FROM trainers`;
    return true;
  } catch (error) {
    console.error('Error deleting all trainers:', error);
    throw error;
  }
}
