import { Client } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'tasks_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'tasks',
});

async function fixMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating migrations table...');
      await client.query(`
        CREATE TABLE "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        )
      `);
    }

    // Check if migrations are already recorded
    const existingMigrations = await client.query('SELECT * FROM migrations ORDER BY timestamp');
    console.log(`Found ${existingMigrations.rows.length} existing migration records`);

    // Define all migrations
    const migrations = [
      { timestamp: 1732704000000, name: 'InitialSchema1732704000000' },
      { timestamp: 1764646517808, name: 'AddUserIdAndProjectIdToActivityLogs1764646517808' },
      { timestamp: 1764650038897, name: 'CreateUserInvitation1764650038897' },
      { timestamp: 1764654000000, name: 'AddThemesAndUserSettings1764654000000' },
    ];

    // Insert missing migration records
    for (const migration of migrations) {
      const exists = existingMigrations.rows.find(
        (m) => m.timestamp === migration.timestamp.toString() || m.name === migration.name
      );

      if (!exists) {
        await client.query(
          'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
          [migration.timestamp, migration.name]
        );
        console.log(`✅ Marked migration as completed: ${migration.name}`);
      } else {
        console.log(`⏭️  Migration already exists: ${migration.name}`);
      }
    }

    console.log('\n✅ ========== MIGRATION FIX COMPLETED ==========');
  } catch (error) {
    console.error('❌ Error fixing migrations:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixMigrations().catch((error) => {
  console.error(error);
  process.exit(1);
});
