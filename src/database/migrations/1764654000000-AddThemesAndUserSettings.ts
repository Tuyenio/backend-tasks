import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemesAndUserSettings1764654000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create themes table
    const themesTableExists = await queryRunner.hasTable('themes');
    if (!themesTableExists) {
      await queryRunner.query(`
        CREATE TABLE "themes" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "name" varchar(255) NOT NULL,
          "description" text,
          "colors" jsonb NOT NULL,
          "isPublic" boolean DEFAULT false,
          "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL,
          "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created themes table');
    }

    // Create user_settings table
    const userSettingsTableExists = await queryRunner.hasTable('user_settings');
    if (!userSettingsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "user_settings" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "userId" uuid UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
          "language" varchar(10) DEFAULT 'en',
          "timezone" varchar(50) DEFAULT 'UTC',
          "dateFormat" varchar(20) DEFAULT 'YYYY-MM-DD',
          "timeFormat" varchar(10) DEFAULT '24h',
          "themeId" uuid REFERENCES "themes"("id") ON DELETE SET NULL,
          "emailNotifications" boolean DEFAULT true,
          "pushNotifications" boolean DEFAULT true,
          "soundEnabled" boolean DEFAULT true,
          "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created user_settings table');
    }

    // Insert default themes
    const themeCount = await queryRunner.query(`SELECT COUNT(*) FROM "themes"`);
    if (parseInt(themeCount[0].count) === 0) {
      await queryRunner.query(`
        INSERT INTO "themes" ("name", "description", "colors", "isPublic")
        VALUES 
          ('Light', 'Default light theme', 
           '{"primary": "#3b82f6", "secondary": "#8b5cf6", "background": "#ffffff", "text": "#1f2937", "success": "#10b981", "warning": "#f59e0b", "error": "#ef4444", "info": "#3b82f6"}',
           true),
          ('Dark', 'Default dark theme', 
           '{"primary": "#60a5fa", "secondary": "#a78bfa", "background": "#111827", "text": "#f9fafb", "success": "#34d399", "warning": "#fbbf24", "error": "#f87171", "info": "#60a5fa"}',
           true),
          ('Ocean', 'Ocean blue theme', 
           '{"primary": "#0ea5e9", "secondary": "#06b6d4", "background": "#ffffff", "text": "#0f172a", "success": "#14b8a6", "warning": "#f59e0b", "error": "#ef4444", "info": "#0ea5e9"}',
           true),
          ('Forest', 'Forest green theme', 
           '{"primary": "#22c55e", "secondary": "#84cc16", "background": "#ffffff", "text": "#14532d", "success": "#22c55e", "warning": "#eab308", "error": "#dc2626", "info": "#3b82f6"}',
           true),
          ('Sunset', 'Warm sunset theme', 
           '{"primary": "#f97316", "secondary": "#fb923c", "background": "#ffffff", "text": "#431407", "success": "#10b981", "warning": "#f59e0b", "error": "#dc2626", "info": "#f97316"}',
           true)
      `);
      console.log('✅ Inserted default themes');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "themes" CASCADE`);
  }
}
