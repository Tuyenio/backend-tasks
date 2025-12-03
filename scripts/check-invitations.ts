import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'tasks_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'tasks',
  logging: false,
});

async function checkSchema() {
  try {
    await ds.initialize();
    console.log('✅ Connected to database');

    const result = await ds.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_invitations' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 user_invitations table columns:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name}`);
    });

    // Check for status column
    const hasStatus = result.some((col: any) => col.column_name === 'status');
    if (hasStatus) {
      console.log('\n✅ Status column exists');
    } else {
      console.log('\n❌ Status column MISSING - needs migration');
    }

    await ds.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
