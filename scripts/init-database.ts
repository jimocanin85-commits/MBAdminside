/**
 * Database Initialization Script
 * Run this once to set up the database schema
 * 
 * Usage:
 *   npx tsx scripts/init-database.ts
 * 
 * Or set DATABASE_URL and run:
 *   DATABASE_URL=your_connection_string npx tsx scripts/init-database.ts
 */

import { initDatabase } from '../src/integrations/database/client';

async function main() {
  try {
    console.log('Initializing database schema...');
    await initDatabase();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

main();
