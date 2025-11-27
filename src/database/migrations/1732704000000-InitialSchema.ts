import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732704000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ==================== USERS & AUTH ====================
    
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(255) UNIQUE NOT NULL,
        "password" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "avatarUrl" varchar(255),
        "phone" varchar(20),
        "bio" text,
        "department" varchar(100),
        "jobRole" varchar(100),
        "status" varchar(20) DEFAULT 'offline',
        "isActive" boolean DEFAULT true,
        "emailVerified" boolean DEFAULT false,
        "verificationToken" varchar(255),
        "resetPasswordToken" varchar(255),
        "resetPasswordExpires" timestamp,
        "twoFactorEnabled" boolean DEFAULT false,
        "twoFactorSecret" varchar(255),
        "lastLoginAt" timestamp,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_USER_EMAIL" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_USER_STATUS" ON "users" ("status")`);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(50) UNIQUE NOT NULL,
        "displayName" varchar(100) NOT NULL,
        "description" text,
        "isSystem" boolean DEFAULT false,
        "color" varchar(20) DEFAULT '#6366f1',
        "permissions" text NOT NULL,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid REFERENCES "roles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "role_id")
      )
    `);

    // Create user_sessions table
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "token" text NOT NULL,
        "device" varchar(255),
        "location" varchar(255),
        "ipAddress" varchar(45),
        "lastActiveAt" timestamp,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" timestamp NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_SESSION_USER" ON "user_sessions" ("user_id")`);

    // ==================== TAGS ====================
    
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) UNIQUE NOT NULL,
        "color" varchar(20) DEFAULT '#6366f1',
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==================== PROJECTS ====================
    
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "color" varchar(20) DEFAULT '#3b82f6',
        "status" varchar(20) DEFAULT 'active',
        "startDate" date,
        "endDate" date,
        "deadline" date,
        "progress" integer DEFAULT 0,
        "createdById" uuid REFERENCES "users"("id"),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_PROJECT_STATUS" ON "projects" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("project_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_tags" (
        "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
        "tag_id" uuid REFERENCES "tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("project_id", "tag_id")
      )
    `);

    // ==================== TASKS ====================
    
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(500) NOT NULL,
        "description" text NOT NULL,
        "status" varchar(20) DEFAULT 'todo',
        "priority" varchar(20) DEFAULT 'medium',
        "dueDate" date,
        "estimatedHours" integer DEFAULT 0,
        "commentsCount" integer DEFAULT 0,
        "projectId" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
        "createdById" uuid REFERENCES "users"("id"),
        "assignedById" uuid REFERENCES "users"("id"),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_TASK_STATUS" ON "tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_TASK_PRIORITY" ON "tasks" ("priority")`);
    await queryRunner.query(`CREATE INDEX "IDX_TASK_DUE_DATE" ON "tasks" ("dueDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_TASK_PROJECT" ON "tasks" ("projectId")`);

    await queryRunner.query(`
      CREATE TABLE "task_assignees" (
        "task_id" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("task_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_tags" (
        "task_id" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
        "tag_id" uuid REFERENCES "tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("task_id", "tag_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_reminders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "taskId" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
        "reminderDate" timestamp NOT NULL,
        "message" varchar(500) NOT NULL,
        "isActive" boolean DEFAULT true,
        "createdById" uuid REFERENCES "users"("id"),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_checklist_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "taskId" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
        "title" varchar(500) NOT NULL,
        "completed" boolean DEFAULT false,
        "order" integer DEFAULT 0
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attachments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "url" text NOT NULL,
        "type" varchar(20) DEFAULT 'other',
        "mimeType" varchar(100) NOT NULL,
        "size" bigint NOT NULL,
        "taskId" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
        "uploadedById" uuid REFERENCES "users"("id"),
        "uploadedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_comments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "content" text NOT NULL,
        "authorId" uuid REFERENCES "users"("id"),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "comment_reactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "commentId" uuid REFERENCES "task_comments"("id") ON DELETE CASCADE,
        "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "emoji" varchar(10) NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_COMMENT_REACTION" ON "comment_reactions" ("commentId")`);

    // ==================== NOTES ====================
    
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(500) NOT NULL,
        "content" text NOT NULL,
        "tags" text,
        "isPinned" boolean DEFAULT false,
        "isShared" boolean DEFAULT false,
        "createdById" uuid REFERENCES "users"("id"),
        "projectId" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_NOTE_CREATED_BY" ON "notes" ("createdById")`);

    await queryRunner.query(`
      CREATE TABLE "note_shared_with" (
        "note_id" uuid REFERENCES "notes"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("note_id", "user_id")
      )
    `);

    // ==================== CHAT ====================
    
    await queryRunner.query(`
      CREATE TABLE "chats" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255),
        "type" varchar(20) DEFAULT 'direct',
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_members" (
        "chat_id" uuid REFERENCES "chats"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("chat_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "type" varchar(20) DEFAULT 'text',
        "attachmentUrls" text,
        "chatId" uuid REFERENCES "chats"("id") ON DELETE CASCADE,
        "senderId" uuid REFERENCES "users"("id"),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_MESSAGE_CHAT" ON "messages" ("chatId")`);
    await queryRunner.query(`CREATE INDEX "IDX_MESSAGE_CREATED_AT" ON "messages" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE "message_read_status" (
        "message_id" uuid REFERENCES "messages"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("message_id", "user_id")
      )
    `);

    // ==================== NOTIFICATIONS ====================
    
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "type" varchar(50) DEFAULT 'info',
        "read" boolean DEFAULT false,
        "link" varchar(500),
        "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_NOTIFICATION_USER" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_NOTIFICATION_READ" ON "notifications" ("read")`);
    await queryRunner.query(`CREATE INDEX "IDX_NOTIFICATION_CREATED" ON "notifications" ("createdAt")`);

    // ==================== SYSTEM ====================
    
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "action" varchar(50) NOT NULL,
        "entityType" varchar(50) NOT NULL,
        "entityId" uuid NOT NULL,
        "metadata" jsonb,
        "ipAddress" varchar(45),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_ACTIVITY_USER" ON "activity_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ACTIVITY_ENTITY" ON "activity_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_ACTIVITY_CREATED" ON "activity_logs" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE "custom_themes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text,
        "mode" varchar(20) DEFAULT 'light',
        "colors" jsonb NOT NULL,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" varchar(255) UNIQUE NOT NULL,
        "value" text NOT NULL,
        "type" varchar(50) NOT NULL,
        "description" text,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==================== INSERT DEFAULT DATA ====================
    
    // Insert default roles
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "displayName", "description", "isSystem", "color", "permissions")
      VALUES 
        (uuid_generate_v4(), 'super_admin', 'Super Admin', 'Full system access', true, '#dc2626', 
         'projects.create,projects.update,projects.delete,projects.view,tasks.create,tasks.update,tasks.delete,tasks.view,tasks.assign,tasks.complete,notes.create,notes.update,notes.delete,notes.view,chat.create,chat.send,chat.delete,reports.view,reports.export,reports.create,users.view,users.manage,users.invite,roles.view,roles.manage,roles.create,roles.delete,settings.view,settings.manage,team.view,team.manage'),
        (uuid_generate_v4(), 'admin', 'Admin', 'Administrative access', true, '#ea580c', 
         'projects.create,projects.update,projects.delete,projects.view,tasks.create,tasks.update,tasks.delete,tasks.view,tasks.assign,tasks.complete,notes.create,notes.update,notes.delete,notes.view,chat.create,chat.send,chat.delete,reports.view,reports.export,reports.create,users.view,users.manage,users.invite,settings.view,team.view,team.manage'),
        (uuid_generate_v4(), 'manager', 'Manager', 'Project management access', true, '#ca8a04', 
         'projects.create,projects.update,projects.view,tasks.create,tasks.update,tasks.delete,tasks.view,tasks.assign,tasks.complete,notes.create,notes.update,notes.delete,notes.view,chat.create,chat.send,reports.view,reports.export,users.view,team.view'),
        (uuid_generate_v4(), 'member', 'Member', 'Standard member access', true, '#16a34a', 
         'projects.view,tasks.create,tasks.update,tasks.view,tasks.complete,notes.create,notes.update,notes.view,chat.create,chat.send,reports.view,users.view,team.view'),
        (uuid_generate_v4(), 'guest', 'Guest', 'Limited guest access', true, '#6b7280', 
         'projects.view,tasks.view,notes.view,reports.view,users.view,team.view')
    `);

    // Insert default system settings
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "description")
      VALUES 
        ('app.name', 'TaskMaster', 'string', 'Application name'),
        ('app.registration_enabled', 'true', 'boolean', 'Allow new user registration'),
        ('app.email_verification_required', 'false', 'boolean', 'Require email verification'),
        ('file.max_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)'),
        ('file.max_attachments_per_task', '10', 'number', 'Maximum attachments per task'),
        ('session.timeout_minutes', '1440', 'number', 'Session timeout in minutes (24 hours)'),
        ('task.max_per_user', '1000', 'number', 'Maximum tasks per user')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_themes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_read_status" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_members" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chats" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "note_shared_with" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comment_reactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attachments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_checklist_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_reminders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_assignees" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
