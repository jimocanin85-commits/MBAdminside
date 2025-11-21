/**
 * Migration Script: localStorage to Neon Database
 * 
 * This script migrates all localStorage data to Neon PostgreSQL database
 * 
 * Usage:
 *   1. Set DATABASE_URL in your environment
 *   2. Run: npx tsx scripts/migrate-localStorage-to-neon.ts
 * 
 * Note: This is a one-time migration script. Run it after setting up Neon.
 */

import { initDatabase, saveChecklistData, createTrainer, type Trainer } from '../src/integrations/database/client';

async function migrateFromLocalStorage() {
  console.log('🚀 Starting migration from localStorage to Neon...\n');

  try {
    // Initialize database schema
    console.log('1. Initializing database schema...');
    await initDatabase();
    console.log('✅ Database schema initialized\n');

    // Migrate trainers
    console.log('2. Migrating trainers...');
    if (typeof window !== 'undefined' && window.localStorage) {
      const trainersJson = localStorage.getItem('trainers');
      if (trainersJson) {
        const trainers: Trainer[] = JSON.parse(trainersJson);
        console.log(`   Found ${trainers.length} trainers in localStorage`);
        
        for (const trainer of trainers) {
          try {
            await createTrainer({
              navn: trainer.navn,
              email: trainer.email || '',
              telefon: trainer.telefon || '',
              foedselsdato: new Date(trainer.foedselsdato),
              aargang: trainer.aargang || '',
              rolle: trainer.rolle || '',
              kontaktperson: trainer.kontaktperson || '',
              excelData: trainer.excelData || null
            });
            console.log(`   ✅ Migrated trainer: ${trainer.navn}`);
          } catch (error) {
            console.error(`   ❌ Error migrating trainer ${trainer.navn}:`, error);
          }
        }
      } else {
        console.log('   No trainers found in localStorage');
      }
    } else {
      console.log('   ⚠️  localStorage not available (running in Node.js)');
      console.log('   💡 To migrate trainers, run this in browser console:');
      console.log('      localStorage.getItem("trainers")');
    }
    console.log('');

    // Migrate checklist
    console.log('3. Migrating checklist...');
    if (typeof window !== 'undefined' && window.localStorage) {
      const checklistJson = localStorage.getItem('frivilligfest2026');
      if (checklistJson) {
        const checklistData = JSON.parse(checklistJson);
        await saveChecklistData(checklistData);
        console.log('   ✅ Checklist data migrated');
      } else {
        console.log('   No checklist data found in localStorage');
      }
    } else {
      console.log('   ⚠️  localStorage not available (running in Node.js)');
      console.log('   💡 Checklist will migrate automatically on first save');
    }
    console.log('');

    console.log('✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify data in Neon dashboard');
    console.log('   2. Test the application');
    console.log('   3. Remove localStorage fallback code (optional)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateFromLocalStorage();
}

export { migrateFromLocalStorage };
