import { Client } from 'pg';

async function checkCounts() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'tasks_user',
    password: '123456',
    database: 'tasks',
  });

  await c.connect();

  const tables = [
    'users',
    'roles',
    'projects',
    'tasks',
    'tags',
    'chats',
    'messages',
    'notes',
    'notifications',
    'attachments',
    'task_comments',
    'task_checklist_items',
    'task_reminders',
    'activity_logs',
    'user_sessions',
    'comment_reactions',
  ];

  console.log('Current table counts:');
  for (const t of tables) {
    const r = await c.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }

  await c.end();
}

checkCounts();
