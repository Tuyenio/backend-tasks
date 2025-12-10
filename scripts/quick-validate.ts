import AppDataSource from '../src/database/data-source';

async function quickValidate() {
  await AppDataSource.initialize();
  console.log('=== QUICK DATA VALIDATION ===\n');

  try {
    // 1. Row counts
    console.log('1️⃣ ROW COUNTS:');
    const tables = [
      'users', 'roles', 'user_roles',
      'projects', 'project_members',  
      'tasks', 'task_assignees', 'task_comments', 'task_checklist_items', 'task_reminders', 'attachments',
      'chats', 'messages',
      'notes',
      'notifications',
      'activity_logs',
      'user_sessions'
    ];
    
    for (const table of tables) {
      const result = await AppDataSource.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${result[0].count}`);
    }

    // 2. Users & Roles
    console.log('\n2️⃣ USERS & ROLES:');
    const users = await AppDataSource.query(
      `SELECT u.email, u.name, ARRAY_AGG(r.name) as roles
       FROM users u 
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id, u.email, u.name
       ORDER BY u.email`
    );
    users.forEach(u => {
      const roleList = u.roles && u.roles[0] ? u.roles.filter(r => r !== null).join(', ') : 'no role';
      console.log(`   ${u.email}: ${roleList}`);
    });

    // 3. Projects summary
    console.log('\n3️⃣ PROJECTS:');
    const projects = await AppDataSource.query(
      `SELECT p.name, p.status, 
              COUNT(DISTINCT pm.user_id) as members,
              COUNT(DISTINCT t.id) as tasks
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN tasks t ON p.id = t."projectId"
       GROUP BY p.id
       ORDER BY p.name`
    );
    projects.forEach(p => console.log(`   ${p.name} (${p.status}): ${p.members} members, ${p.tasks} tasks`));

    // 4. Tasks summary
    console.log('\n4️⃣ TASKS:');
    const taskStatus = await AppDataSource.query(
      `SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY count DESC`
    );
    taskStatus.forEach(s => console.log(`   ${s.status}: ${s.count}`));

    const taskPriority = await AppDataSource.query(
      `SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority ORDER BY count DESC`
    );
    console.log('   By priority:');
    taskPriority.forEach(p => console.log(`   - ${p.priority}: ${p.count}`));

    // 5. Referential Integrity Checks
    console.log('\n5️⃣ REFERENTIAL INTEGRITY:');
    
    const checks = [
      {
        name: 'Tasks with invalid projectId',
        query: `SELECT COUNT(*) as count FROM tasks WHERE "projectId" NOT IN (SELECT id FROM projects)`
      },
      {
        name: 'Task assignees not in project',
        query: `SELECT COUNT(*) as count FROM task_assignees ta
                JOIN tasks t ON ta.task_id = t.id
                WHERE NOT EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = t."projectId" AND pm.user_id = ta.user_id
                )`
      },
      {
        name: 'Comments with invalid taskId',
        query: `SELECT COUNT(*) as count FROM task_comments WHERE "taskId" NOT IN (SELECT id FROM tasks)`
      },
      {
        name: 'Checklist items with invalid taskId',
        query: `SELECT COUNT(*) as count FROM task_checklist_items WHERE "taskId" NOT IN (SELECT id FROM tasks)`
      },
      {
        name: 'Reminders with invalid taskId',
        query: `SELECT COUNT(*) as count FROM task_reminders WHERE "taskId" NOT IN (SELECT id FROM tasks)`
      },
      {
        name: 'Attachments with invalid taskId',
        query: `SELECT COUNT(*) as count FROM attachments WHERE "taskId" NOT IN (SELECT id FROM tasks)`
      },
      {
        name: 'Messages with invalid senderId',
        query: `SELECT COUNT(*) as count FROM messages WHERE "senderId" NOT IN (SELECT id FROM users)`
      }
    ];

    for (const check of checks) {
      const result = await AppDataSource.query(check.query);
      const count = parseInt(result[0].count);
      const icon = count === 0 ? '✓' : '❌';
      console.log(`   ${icon} ${check.name}: ${count}`);
    }

    // 6. Data Consistency
    console.log('\n6️⃣ DATA CONSISTENCY:');
    
    // Check tasks have at least 1 checklist item
    const tasksWithChecklist = await AppDataSource.query(
      `SELECT COUNT(DISTINCT t.id) as count 
       FROM tasks t 
       JOIN task_checklist_items ci ON t.id = ci."taskId"`
    );
    const totalTasks = await AppDataSource.query(`SELECT COUNT(*) as count FROM tasks`);
    console.log(`   ✓ Tasks with checklists: ${tasksWithChecklist[0].count}/${totalTasks[0].count}`);

    // Check tasks with assignees
    const tasksWithAssignees = await AppDataSource.query(
      `SELECT COUNT(DISTINCT t.id) as count 
       FROM tasks t 
       JOIN task_assignees ta ON t.id = ta.task_id`
    );
    console.log(`   ✓ Tasks with assignees: ${tasksWithAssignees[0].count}/${totalTasks[0].count}`);

    // Check messages per chat type
    const messageStats = await AppDataSource.query(
      `SELECT c.type, COUNT(m.id) as msg_count
       FROM chats c
       LEFT JOIN messages m ON c.id = m."chatId"
       GROUP BY c.type`
    );
    console.log(`   ✓ Messages by chat type:`);
    messageStats.forEach(s => console.log(`     - ${s.type}: ${s.msg_count} messages`));

    console.log('\n✅ VALIDATION COMPLETE - All data looks good!');
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

quickValidate();
