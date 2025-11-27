import { DataSource } from 'typeorm';

async function resetDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'tasks_user',
    password: '123456',
    database: 'tasks',
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Drop all tables
    const tables = [
      'system_settings',
      'custom_themes',
      'activity_logs',
      'notifications',
      'message_read_status',
      'messages',
      'chat_members',
      'chats',
      'note_shared_with',
      'notes',
      'comment_reactions',
      'task_comments',
      'attachments',
      'task_checklist_items',
      'task_reminders',
      'task_tags',
      'task_assignees',
      'tasks',
      'project_tags',
      'project_members',
      'projects',
      'tags',
      'user_sessions',
      'user_roles',
      'roles',
      'users',
      'migrations',
    ];

    console.log('Dropping tables...');
    for (const table of tables) {
      try {
        await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.log(`Skip table: ${table}`);
      }
    }

    console.log('\n✅ Database reset successfully!');
    console.log('Now you can start the server to run migrations automatically.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

resetDatabase();
