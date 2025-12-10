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
      const roleList = u.roles ? u.roles.filter(r => r !== null).join(', ') : 'no role';
      console.log(`     - ${u.email} (${u.name}): ${roleList}`);
    });

    // 2. Projects và Members
    console.log('\n2️⃣ PROJECTS & MEMBERS:');
    const projects = await AppDataSource.query(
      `SELECT p.id, p.name, p.status, p."ownerId", COUNT(DISTINCT pm."userId") as member_count, COUNT(DISTINCT t.id) as task_count
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm."projectId"
       LEFT JOIN tasks t ON p.id = t."projectId"
       GROUP BY p.id
       ORDER BY p."createdAt"`
    );
    projects.forEach(p => console.log(`   ✓ ${p.name} (${p.status}): ${p.member_count} members, ${p.task_count} tasks`));

    // 3. Tasks với assignees và project validation
    console.log('\n3️⃣ TASKS & ASSIGNMENTS:');
    const tasks = await AppDataSource.query(
      `SELECT t.id, t.title, t.status, t.priority, t."projectId", p.name as project_name,
              COUNT(DISTINCT ta."userId") as assignee_count,
              COUNT(DISTINCT c.id) as comment_count,
              COUNT(DISTINCT ci.id) as checklist_count
       FROM tasks t
       LEFT JOIN projects p ON t."projectId" = p.id
       LEFT JOIN task_assignees ta ON t.id = ta."taskId"
       LEFT JOIN task_comments c ON t.id = c."taskId"
       LEFT JOIN task_checklist_items ci ON t.id = ci."taskId"
       GROUP BY t.id, p.name
       ORDER BY t."createdAt"
       LIMIT 10`
    );
    tasks.forEach(t => console.log(`   ✓ ${t.title.substring(0, 40)}... [${t.project_name}]: ${t.assignee_count} assignees, ${t.comment_count} comments, ${t.checklist_count} items`));
    console.log(`   Total: ${(await AppDataSource.query('SELECT COUNT(*) FROM tasks'))[0].count} tasks`);

    // 4. Task assignees validation (users phải là members của project)
    console.log('\n4️⃣ TASK ASSIGNEES VALIDATION:');
    const invalidAssignments = await AppDataSource.query(
      `SELECT t.title, u.email, p.name as project
       FROM task_assignees ta
       JOIN tasks t ON ta."taskId" = t.id
       JOIN users u ON ta."userId" = u.id
       JOIN projects p ON t."projectId" = p.id
       WHERE NOT EXISTS (
         SELECT 1 FROM project_members pm 
         WHERE pm."projectId" = t."projectId" AND pm."userId" = ta."userId"
       )`
    );
    if (invalidAssignments.length > 0) {
      console.log(`   ❌ Found ${invalidAssignments.length} invalid assignments (user not in project):`);
      invalidAssignments.forEach(a => console.log(`     - ${a.email} assigned to task in ${a.project} but not a member`));
    } else {
      console.log(`   ✓ All task assignments valid (assignees are project members)`);
    }

    // 5. Chats và Messages
    console.log('\n5️⃣ CHATS & MESSAGES:');
    const chats = await AppDataSource.query(
      `SELECT c.id, c.type, c.name, COUNT(DISTINCT m.id) as message_count, COUNT(DISTINCT cp."userId") as participant_count
       FROM chats c
       LEFT JOIN messages m ON c.id = m."chatId"
       LEFT JOIN chat_participants cp ON c.id = cp."chatId"
       GROUP BY c.id
       ORDER BY c."createdAt"`
    );
    chats.forEach(ch => console.log(`   ✓ ${ch.type === 'direct' ? 'Direct' : ch.name} (${ch.type}): ${ch.participant_count} participants, ${ch.message_count} messages`));

    // 6. Chat participants validation
    console.log('\n6️⃣ CHAT PARTICIPANTS VALIDATION:');
    const invalidChatUsers = await AppDataSource.query(
      `SELECT c.name, u.email, c.type
       FROM chat_participants cp
       JOIN chats c ON cp."chatId" = c.id
       JOIN users u ON cp."userId" = u.id
       WHERE cp."userId" NOT IN (SELECT id FROM users)`
    );
    if (invalidChatUsers.length > 0) {
      console.log(`   ❌ Found ${invalidChatUsers.length} invalid chat participants`);
    } else {
      console.log(`   ✓ All chat participants are valid users`);
    }

    // 7. Messages validation (sender phải là participant)
    console.log('\n7️⃣ MESSAGES VALIDATION:');
    const invalidMessages = await AppDataSource.query(
      `SELECT m.content, u.email, c.name
       FROM messages m
       JOIN chats c ON m."chatId" = c.id
       JOIN users u ON m."senderId" = u.id
       WHERE NOT EXISTS (
         SELECT 1 FROM chat_participants cp 
         WHERE cp."chatId" = m."chatId" AND cp."userId" = m."senderId"
       )`
    );
    if (invalidMessages.length > 0) {
      console.log(`   ❌ Found ${invalidMessages.length} messages from non-participants`);
    } else {
      console.log(`   ✓ All messages sent by chat participants`);
    }

    // 8. Notes và Sharing
    console.log('\n8️⃣ NOTES & SHARING:');
    const notes = await AppDataSource.query(
      `SELECT n.id, n.title, u.email as owner, COUNT(DISTINCT ns."userId") as shared_with
       FROM notes n
       JOIN users u ON n."ownerId" = u.id
       LEFT JOIN note_shares ns ON n.id = ns."noteId"
       GROUP BY n.id, u.email
       ORDER BY n."createdAt"`
    );
    notes.forEach(n => console.log(`   ✓ ${n.title.substring(0, 40)}... by ${n.owner}: shared with ${n.shared_with} users`));

    // 9. Notifications validation
    console.log('\n9️⃣ NOTIFICATIONS VALIDATION:');
    const notificationStats = await AppDataSource.query(
      `SELECT u.email, 
              COUNT(CASE WHEN n.read = false THEN 1 END) as unread,
              COUNT(CASE WHEN n.read = true THEN 1 END) as read,
              COUNT(DISTINCT n.type) as types
       FROM users u
       LEFT JOIN notifications n ON u.id = n."userId"
       GROUP BY u.id, u.email
       ORDER BY u.email`
    );
    notificationStats.forEach(s => console.log(`   ✓ ${s.email}: ${s.unread} unread, ${s.read} read (${s.types} types)`));

    // 10. Activity Logs validation
    console.log('\n🔟 ACTIVITY LOGS VALIDATION:');
    const activityStats = await AppDataSource.query(
      `SELECT action, "entityType", COUNT(*) as count
       FROM activity_logs
       GROUP BY action, "entityType"
       ORDER BY count DESC`
    );
    activityStats.forEach(a => console.log(`   ✓ ${a.action} on ${a.entitytype}: ${a.count} logs`));

    // 11. Check orphaned records
    console.log('\n1️⃣1️⃣ ORPHANED RECORDS CHECK:');
    
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

    // 12. Check data consistency
    console.log('\n1️⃣2️⃣ DATA CONSISTENCY:');
    const taskStatusDistribution = await AppDataSource.query(
      `SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY count DESC`
    );
    console.log(`   ✓ Task status distribution:`);
    taskStatusDistribution.forEach(s => console.log(`     - ${s.status}: ${s.count} tasks`));

    const projectStatusDistribution = await AppDataSource.query(
      `SELECT status, COUNT(*) as count FROM projects GROUP BY status ORDER BY count DESC`
    );
    console.log(`   ✓ Project status distribution:`);
    projectStatusDistribution.forEach(s => console.log(`     - ${s.status}: ${s.count} projects`));

    console.log('\n✅ VALIDATION COMPLETE');
  } catch (error) {
    console.error('❌ Validation error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

validateAllData();
