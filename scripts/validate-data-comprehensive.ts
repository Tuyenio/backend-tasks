import AppDataSource from '../src/database/data-source';

async function validateAllData() {
  await AppDataSource.initialize();
  console.log('=== VALIDATING ALL DATA ===\n');

  try {
    // 1. Users và Roles
    console.log('1️⃣ USERS & ROLES:');
    const users = await AppDataSource.query(
      `SELECT u.id, u.email, u.name, 
              ARRAY_AGG(r.name) as roles,
              ARRAY_AGG(r.permissions) as permissions
       FROM users u 
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id, u.email, u.name
       ORDER BY u.email`
    );
    console.log(`   ✓ ${users.length} users with role assignments`);
    users.forEach(u => {
      const roleList = u.roles && u.roles[0] ? u.roles.filter(r => r !== null).join(', ') : 'no role';
      console.log(`     - ${u.email} (${u.name}): ${roleList}`);
    });

    // 2. Projects và Members
    console.log('\n2️⃣ PROJECTS & MEMBERS:');
    const projects = await AppDataSource.query(
      `SELECT p.id, p.name, p.status, p."createdById", 
              COUNT(DISTINCT pm.user_id) as member_count, 
              COUNT(DISTINCT t.id) as task_count
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN tasks t ON p.id = t."projectId"
       GROUP BY p.id
       ORDER BY p."createdAt"`
    );
    projects.forEach(p => console.log(`   ✓ ${p.name} (${p.status}): ${p.member_count} members, ${p.task_count} tasks`));

    // 3. Tasks với assignees
    console.log('\n3️⃣ TASKS OVERVIEW:');
    const taskStats = await AppDataSource.query(
      `SELECT t.status, COUNT(*) as count
       FROM tasks t
       GROUP BY t.status
       ORDER BY count DESC`
    );
    taskStats.forEach(s => console.log(`   ✓ ${s.status}: ${s.count} tasks`));

    const taskSample = await AppDataSource.query(
      `SELECT t.id, t.title, t.status, t.priority, p.name as project_name,
              COUNT(DISTINCT ta.user_id) as assignee_count,
              COUNT(DISTINCT c.id) as comment_count,
              COUNT(DISTINCT ci.id) as checklist_count
       FROM tasks t
       LEFT JOIN projects p ON t."projectId" = p.id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN task_comments c ON t.id = c."taskId"
       LEFT JOIN task_checklist_items ci ON t.id = ci."taskId"
       GROUP BY t.id, p.name
       ORDER BY t."createdAt"
       LIMIT 5`
    );
    console.log(`\n   Sample tasks:`);
    taskSample.forEach(t => console.log(`     - ${t.title.substring(0, 35)}... [${t.project_name}]: ${t.assignee_count} assignees, ${t.comment_count} comments, ${t.checklist_count} items`));

    // 4. Task assignees validation (phải là members của project)
    console.log('\n4️⃣ TASK ASSIGNEES VALIDATION:');
    const invalidAssignments = await AppDataSource.query(
      `SELECT t.title, u.email, p.name as project
       FROM task_assignees ta
       JOIN tasks t ON ta.task_id = t.id
       JOIN users u ON ta.user_id = u.id
       JOIN projects p ON t."projectId" = p.id
       WHERE NOT EXISTS (
         SELECT 1 FROM project_members pm 
         WHERE pm.project_id = t."projectId" AND pm.user_id = ta.user_id
       )`
    );
    if (invalidAssignments.length > 0) {
      console.log(`   ❌ Found ${invalidAssignments.length} invalid assignments:`);
      invalidAssignments.forEach(a => console.log(`     - ${a.email} assigned to "${a.title.substring(0, 30)}" in ${a.project} but not a member`));
    } else {
      console.log(`   ✓ All task assignments valid (assignees are project members)`);
    }

    // 5. Chats và Messages
    console.log('\n5️⃣ CHATS & MESSAGES:');
    const chatStats = await AppDataSource.query(
      `SELECT c.type, COUNT(DISTINCT c.id) as chat_count, COUNT(m.id) as message_count
       FROM chats c
       LEFT JOIN messages m ON c.id = m."chatId"
       GROUP BY c.type`
    );
    chatStats.forEach(s => console.log(`   ✓ ${s.type} chats: ${s.chat_count} chats with ${s.message_count} messages`));

    // 6. Messages validation - sender phải tồn tại
    console.log('\n6️⃣ MESSAGES VALIDATION:');
    const invalidMessages = await AppDataSource.query(
      `SELECT COUNT(*) as count
       FROM messages m
       WHERE m."senderId" NOT IN (SELECT id FROM users)`
    );
    if (invalidMessages[0].count > 0) {
      console.log(`   ❌ Found ${invalidMessages[0].count} messages from invalid users`);
    } else {
      console.log(`   ✓ All messages have valid senders`);
    }

    // 7. Notes và Sharing
    console.log('\n7️⃣ NOTES & SHARING:');
    const notes = await AppDataSource.query(
      `SELECT n.id, n.title, u.email as owner, COUNT(DISTINCT ns."userId") as shared_with
       FROM notes n
       JOIN users u ON n."ownerId" = u.id
       LEFT JOIN note_shares ns ON n.id = ns."noteId"
       GROUP BY n.id, u.email
       ORDER BY n."createdAt"`
    );
    notes.forEach(n => console.log(`   ✓ ${n.title.substring(0, 40)}... by ${n.owner}: shared with ${n.shared_with} users`));

    // 8. Notifications validation
    console.log('\n8️⃣ NOTIFICATIONS:');
    const notificationStats = await AppDataSource.query(
      `SELECT COUNT(CASE WHEN n.read = false THEN 1 END) as unread,
              COUNT(CASE WHEN n.read = true THEN 1 END) as read,
              COUNT(DISTINCT n.type) as types
       FROM notifications n`
    );
    console.log(`   ✓ Total: ${notificationStats[0].unread} unread, ${notificationStats[0].read} read (${notificationStats[0].types} types)`);

    const notifByType = await AppDataSource.query(
      `SELECT type, COUNT(*) as count FROM notifications GROUP BY type ORDER BY count DESC LIMIT 5`
    );
    console.log(`   Top notification types:`);
    notifByType.forEach(n => console.log(`     - ${n.type}: ${n.count}`));

    // 9. Activity Logs validation
    console.log('\n9️⃣ ACTIVITY LOGS:');
    const activityStats = await AppDataSource.query(
      `SELECT action, "entityType", COUNT(*) as count
       FROM activity_logs
       GROUP BY action, "entityType"
       ORDER BY count DESC`
    );
    activityStats.forEach(a => console.log(`   ✓ ${a.action} on ${a.entitytype}: ${a.count} logs`));

    // 10. Check orphaned records
    console.log('\n🔟 ORPHANED RECORDS CHECK:');
    
    const orphanedComments = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM task_comments WHERE "taskId" NOT IN (SELECT id FROM tasks)`
    );
    console.log(`   ${orphanedComments[0].count === '0' ? '✓' : '❌'} Task comments: ${orphanedComments[0].count} orphaned`);

    const orphanedChecklists = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM task_checklist_items WHERE "taskId" NOT IN (SELECT id FROM tasks)`
    );
    console.log(`   ${orphanedChecklists[0].count === '0' ? '✓' : '❌'} Checklist items: ${orphanedChecklists[0].count} orphaned`);

    const orphanedReminders = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM task_reminders WHERE "taskId" NOT IN (SELECT id FROM tasks)`
    );
    console.log(`   ${orphanedReminders[0].count === '0' ? '✓' : '❌'} Task reminders: ${orphanedReminders[0].count} orphaned`);

    const orphanedAttachments = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM attachments WHERE "taskId" NOT IN (SELECT id FROM tasks)`
    );
    console.log(`   ${orphanedAttachments[0].count === '0' ? '✓' : '❌'} Attachments: ${orphanedAttachments[0].count} orphaned`);

    // 11. Check data consistency
    console.log('\n1️⃣1️⃣ DATA CONSISTENCY:');
    const projectStatusDist = await AppDataSource.query(
      `SELECT status, COUNT(*) as count FROM projects GROUP BY status ORDER BY count DESC`
    );
    console.log(`   ✓ Project status distribution:`);
    projectStatusDist.forEach(s => console.log(`     - ${s.status}: ${s.count} projects`));

    const taskPriorityDist = await AppDataSource.query(
      `SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority ORDER BY count DESC`
    );
    console.log(`   ✓ Task priority distribution:`);
    taskPriorityDist.forEach(s => console.log(`     - ${s.priority}: ${s.count} tasks`));

    // 12. Check referential integrity
    console.log('\n1️⃣2️⃣ REFERENTIAL INTEGRITY:');
    
    const invalidTaskProjects = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM tasks WHERE "projectId" NOT IN (SELECT id FROM projects)`
    );
    console.log(`   ${invalidTaskProjects[0].count === '0' ? '✓' : '❌'} Tasks: ${invalidTaskProjects[0].count} with invalid projectId`);

    const invalidTaskCreators = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM tasks WHERE "createdById" NOT IN (SELECT id FROM users)`
    );
    console.log(`   ${invalidTaskCreators[0].count === '0' ? '✓' : '❌'} Tasks: ${invalidTaskCreators[0].count} with invalid createdById`);

    const invalidProjectCreators = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM projects WHERE "createdById" NOT IN (SELECT id FROM users)`
    );
    console.log(`   ${invalidProjectCreators[0].count === '0' ? '✓' : '❌'} Projects: ${invalidProjectCreators[0].count} with invalid createdById`);

    const invalidNoteOwners = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM notes WHERE "ownerId" NOT IN (SELECT id FROM users)`
    );
    console.log(`   ${invalidNoteOwners[0].count === '0' ? '✓' : '❌'} Notes: ${invalidNoteOwners[0].count} with invalid ownerId`);

    console.log('\n✅ VALIDATION COMPLETE');
  } catch (error) {
    console.error('❌ Validation error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

validateAllData();
