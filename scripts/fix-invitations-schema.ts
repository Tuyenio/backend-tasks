import 'reflect-metadata';
import { Client } from 'pg';
import { config } from 'dotenv';

config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'tasks_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'tasks',
});

async function fixSchema() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if enum exists
    const enumResult = await client.query(`
      SELECT 1 FROM pg_type WHERE typname = 'user_invitations_status_enum'
    `);

    if (enumResult.rows.length === 0) {
      console.log('📝 Creating enum type...');
      await client.query(`
        CREATE TYPE "public"."user_invitations_status_enum" AS ENUM('pending', 'accepted', 'expired', 'cancelled')
      `);
      console.log('✅ Enum created');
    } else {
      console.log('✅ Enum already exists');
    }

    // Check if column exists
    const columnResult = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_invitations' AND column_name = 'status'
    `);

    if (columnResult.rows.length === 0) {
      console.log('📝 Adding status column...');
      await client.query(`
        ALTER TABLE "user_invitations" ADD COLUMN "status" "public"."user_invitations_status_enum" DEFAULT 'pending'
      `);
      console.log('✅ Status column added');
    } else {
      console.log('✅ Status column already exists');
    }

    await client.end();
    console.log('\n✅ Schema fixed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
