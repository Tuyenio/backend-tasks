import AppDataSource from '../src/database/data-source';

async function checkSchema() {
  await AppDataSource.initialize();
  
  const tables = ['users', 'user_roles', 'projects', 'project_members', 'tasks', 'task_assignees', 'task_comments', 'task_checklist_items', 'chats', 'chat_participants', 'messages'];
  
  for (const table of tables) {
    const cols = await AppDataSource.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema='public' AND table_name=$1 
       ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n${table}:`);
    cols.forEach(c => console.log(`  - ${c.column_name}`));
  }
  
  await AppDataSource.destroy();
}

checkSchema();
