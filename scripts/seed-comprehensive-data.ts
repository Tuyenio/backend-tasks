import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seedComprehensiveData() {
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
    console.log('✅ Connected to database\n');

    // ============================================
    // 1. SEED ROLES
    // ============================================
    console.log('📝 Seeding Roles...');
    
    const roles = [
      {
        name: 'super_admin',
        displayName: 'Quản trị tối cao',
        description: 'Toàn quyền hệ thống',
        permissions: ['*'],
        isSystemRole: true,
      },
      {
        name: 'admin',
        displayName: 'Quản trị viên',
        description: 'Quản trị và cấu hình hệ thống',
        permissions: [
          'users.view', 'users.manage', 'users.invite',
          'projects.create', 'projects.update', 'projects.delete', 'projects.view',
          'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.view', 'tasks.assign',
          'notes.create', 'notes.update', 'notes.delete', 'notes.view',
          'reports.view', 'reports.export',
          'roles.view', 'roles.manage',
          'settings.view', 'settings.manage',
        ],
        isSystemRole: true,
      },
      {
        name: 'manager',
        displayName: 'Quản lý',
        description: 'Quản lý nhóm và dự án',
        permissions: [
          'projects.create', 'projects.update', 'projects.view',
          'tasks.create', 'tasks.update', 'tasks.view', 'tasks.assign',
          'notes.create', 'notes.update', 'notes.view',
          'reports.view',
        ],
        isSystemRole: true,
      },
      {
        name: 'member',
        displayName: 'Thành viên',
        description: 'Thành viên thực thi công việc',
        permissions: [
          'projects.view',
          'tasks.create', 'tasks.update', 'tasks.view',
          'notes.create', 'notes.update', 'notes.view',
        ],
        isSystemRole: true,
      },
      {
        name: 'guest',
        displayName: 'Khách',
        description: 'Truy cập giới hạn (xem dự án, công việc, ghi chú)',
        permissions: ['projects.view', 'tasks.view', 'notes.view'],
        isSystemRole: true,
      },
    ];

    // Clear existing roles first
    await dataSource.query('DELETE FROM user_roles');
    await dataSource.query('DELETE FROM roles');
    
    const roleEntities: any[] = [];
    for (const role of roles) {
      const permissionsValue = Array.isArray(role.permissions)
        ? role.permissions.join(',') // simple-array expects comma-separated string
        : role.permissions;

      const result = await dataSource.query(
        `INSERT INTO roles (name, "displayName", description, permissions, "isSystem", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [role.name, role.displayName, role.description, permissionsValue, role.isSystemRole]
      );
      roleEntities.push({ ...role, id: result[0].id });
      console.log(`  ✓ Created role: ${role.displayName}`);
    }

    // ============================================
    // 2. SEED USERS
    // ============================================
    console.log('\n👥 Seeding Users...');
    
    // Clear existing user data
    await dataSource.query('DELETE FROM message_read_status');
    await dataSource.query('DELETE FROM messages');
    await dataSource.query('DELETE FROM chat_members');
    await dataSource.query('DELETE FROM chats');
    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM note_shared_with');
    await dataSource.query('DELETE FROM notes');
    await dataSource.query('DELETE FROM comment_reactions');
    await dataSource.query('DELETE FROM task_comments');
    await dataSource.query('DELETE FROM attachments');
    await dataSource.query('DELETE FROM task_checklist_items');
    await dataSource.query('DELETE FROM task_reminders');
    await dataSource.query('DELETE FROM task_tags');
    await dataSource.query('DELETE FROM task_assignees');
    await dataSource.query('DELETE FROM tasks');
    await dataSource.query('DELETE FROM project_tags');
    await dataSource.query('DELETE FROM project_members');
    await dataSource.query('DELETE FROM projects');
    await dataSource.query('DELETE FROM tags');
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query('DELETE FROM user_sessions');
    await dataSource.query('DELETE FROM user_settings');
    await dataSource.query('DELETE FROM user_roles');
    await dataSource.query('DELETE FROM users');
    
    const hashedPassword = await bcrypt.hash('123123123', 10);
    
    const users = [
      {
        email: 'tt98tuyen@gmail.com',
        name: 'Nguyễn Ngọc Tuyền',
        password: hashedPassword,
        department: 'IT',
        jobRole: 'Super Admin',
        roleName: 'super_admin',
        status: 'online',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tuyen',
      },
      {
        email: 'tuyenkoikop@gmail.com',
        name: 'Nguyễn Minh Thắng',
        password: hashedPassword,
        department: 'IT',
        jobRole: 'Admin',
        roleName: 'admin',
        status: 'online',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thang',
      },
      {
        email: 'nnt11032003@gmail.com',
        name: 'Nguyễn Văn Dũng',
        password: hashedPassword,
        department: 'Product',
        jobRole: 'Manager',
        roleName: 'manager',
        status: 'online',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dung',
      },
      {
        email: 'nguyenngoctuyen11032003@gmail.com',
        name: 'Trương Khánh Linh',
        password: hashedPassword,
        department: 'Development',
        jobRole: 'Member',
        roleName: 'member',
        status: 'online',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Linh',
      },
      {
        email: 'nnt1132003@gmail.com',
        name: 'Hoàng Văn Guest',
        password: hashedPassword,
        department: 'External',
        jobRole: 'Guest',
        roleName: 'guest',
        status: 'online',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
      },
    ];

    const userEntities: any[] = [];
    for (const user of users) {
      const result = await dataSource.query(
        `INSERT INTO users (email, name, password, department, "jobRole", status, "avatarUrl", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         RETURNING id`,
        [user.email, user.name, user.password, user.department, user.jobRole, user.status, user.avatarUrl]
      );
      
      const userId = result[0].id;
      const role = roleEntities.find(r => r.name === user.roleName);
      
      // Assign role to user
      await dataSource.query(
        `INSERT INTO user_roles ("user_id", "role_id") VALUES ($1, $2)`,
        [userId, role.id]
      );
      
      // Create user settings
      await dataSource.query(
        `INSERT INTO user_settings ("userId", language, timezone, "dateFormat", "timeFormat", "emailNotifications", "pushNotifications", "soundEnabled", "createdAt", "updatedAt")
         VALUES ($1, 'vi', 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY', '24h', true, true, true, NOW(), NOW())`,
        [userId]
      );
      
      userEntities.push({ ...user, id: userId, roleId: role.id });
      console.log(`  ✓ Created user: ${user.name} (${user.roleName})`);
    }

    // ============================================
    // 3. CREATE 1:1 CHATS FOR ALL USERS
    // ============================================
    console.log('\n💬 Creating 1:1 Chat Rooms...');
    
    const chatRooms: any[] = [];
    
    // Create chat room for every pair of users
    for (let i = 0; i < userEntities.length; i++) {
      for (let j = i + 1; j < userEntities.length; j++) {
        const user1 = userEntities[i];
        const user2 = userEntities[j];
        
        // Create chat room
        const chatResult = await dataSource.query(
          `INSERT INTO chats (type, name, "createdAt", "updatedAt")
           VALUES ('direct', NULL, NOW(), NOW())
           RETURNING id`,
        );
        
        const chatId = chatResult[0].id;
        
        // Add both users as members
        await dataSource.query(
          `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
          [chatId, user1.id, user2.id]
        );
        
        chatRooms.push({
          id: chatId,
          user1: user1,
          user2: user2,
        });
        
        console.log(`  ✓ Created chat: ${user1.name} <-> ${user2.name}`);
      }
    }

    console.log(`\n  📊 Total chat rooms created: ${chatRooms.length}`);

    // ============================================
    // 4. SEED MESSAGES FOR EACH CHAT
    // ============================================
    console.log('\n📨 Seeding Messages...');
    
    const messageTemplates = [
      'Chào bạn! Bạn khỏe không?',
      'Dự án mới tiến triển như thế nào rồi?',
      'Hôm nay có meeting lúc mấy giờ nhỉ?',
      'Mình cần support task này, bạn rảnh không?',
      'Cảm ơn bạn đã giúp đỡ nhé!',
      'Deadline của sprint này là khi nào?',
      'Báo cáo tuần này mình gửi cho bạn rồi đấy',
      'Review code giúp mình với',
      'Bug đó mình đã fix xong rồi',
      'Ngày mai mình nghỉ nhé',
      'OK, mình sẽ làm task này',
      'Bạn có thể join call không?',
      'Document này cần update lại',
      'Performance có vẻ chậm, cần optimize',
      'Test case đã pass hết chưa?',
    ];

    for (const chat of chatRooms) {
      // Random 5-10 messages per chat
      const messageCount = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < messageCount; i++) {
        const sender = Math.random() > 0.5 ? chat.user1 : chat.user2;
        const message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        
        // Create message with random time in the past 7 days
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const minutesAgo = Math.floor(Math.random() * 60);
        
        const result = await dataSource.query(
          `INSERT INTO messages (content, type, "chatId", "senderId", "createdAt", "updatedAt")
           VALUES ($1, 'text', $2, $3, NOW() - INTERVAL '${daysAgo} days ${hoursAgo} hours ${minutesAgo} minutes', NOW() - INTERVAL '${daysAgo} days ${hoursAgo} hours ${minutesAgo} minutes')
           RETURNING id`,
          [message, chat.id, sender.id]
        );
        
        // Mark as read by sender
        await dataSource.query(
          `INSERT INTO message_read_status (message_id, user_id) VALUES ($1, $2)`,
          [result[0].id, sender.id]
        );
        
        // Random chance to be read by receiver (70%)
        if (Math.random() > 0.3) {
          const receiver = sender.id === chat.user1.id ? chat.user2 : chat.user1;
          await dataSource.query(
            `INSERT INTO message_read_status (message_id, user_id) VALUES ($1, $2)`,
            [result[0].id, receiver.id]
          );
        }
      }
      
      console.log(`  ✓ Seeded ${messageCount} messages for chat: ${chat.user1.name} <-> ${chat.user2.name}`);
    }

    // ============================================
    // 5. SEED TAGS
    // ============================================
    console.log('\n🏷️  Seeding Tags...');
    
    const tags = [
      { name: 'Urgent', color: '#EF4444' },
      { name: 'Bug', color: '#DC2626' },
      { name: 'Feature', color: '#3B82F6' },
      { name: 'Enhancement', color: '#8B5CF6' },
      { name: 'Documentation', color: '#10B981' },
      { name: 'Design', color: '#F59E0B' },
      { name: 'Backend', color: '#06B6D4' },
      { name: 'Frontend', color: '#EC4899' },
      { name: 'Testing', color: '#6366F1' },
      { name: 'DevOps', color: '#14B8A6' },
    ];

    const tagEntities: any[] = [];
    for (const tag of tags) {
      const result = await dataSource.query(
        `INSERT INTO tags (name, color, "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id`,
        [tag.name, tag.color]
      );
      tagEntities.push({ ...tag, id: result[0].id });
      console.log(`  ✓ Created tag: ${tag.name}`);
    }

    // ============================================
    // 6. SEED PROJECTS
    // ============================================
    console.log('\n📁 Seeding Projects...');
    
    const projects = [
      {
        name: 'E-Commerce Platform',
        description: 'Building a modern e-commerce platform with React and Node.js',
        status: 'active',
        color: '#3B82F6',
        progress: 65,
        owner: userEntities[0], // Super Admin
        members: [userEntities[0], userEntities[1], userEntities[2], userEntities[3]],
        tags: [tagEntities[2], tagEntities[6], tagEntities[7]], // Feature, Backend, Frontend
      },
      {
        name: 'Mobile Banking App',
        description: 'Secure mobile banking application for iOS and Android',
        status: 'active',
        color: '#10B981',
        progress: 45,
        owner: userEntities[1], // Admin
        members: [userEntities[1], userEntities[2], userEntities[3]],
        tags: [tagEntities[2], tagEntities[5]], // Feature, Design
      },
      {
        name: 'Internal CRM System',
        description: 'Customer relationship management system for internal use',
        status: 'active',
        color: '#F59E0B',
        progress: 80,
        owner: userEntities[2], // Manager
        members: [userEntities[0], userEntities[2], userEntities[3]],
        tags: [tagEntities[2], tagEntities[6]], // Feature, Backend
      },
      {
        name: 'Analytics Dashboard',
        description: 'Real-time analytics and reporting dashboard',
        status: 'on-hold',
        color: '#8B5CF6',
        progress: 30,
        owner: userEntities[0],
        members: [userEntities[0], userEntities[1], userEntities[3]],
        tags: [tagEntities[2], tagEntities[7]], // Feature, Frontend
      },
      {
        name: 'Documentation Portal',
        description: 'Centralized documentation portal for all projects',
        status: 'completed',
        color: '#06B6D4',
        progress: 100,
        owner: userEntities[1],
        members: [userEntities[1], userEntities[3], userEntities[4]],
        tags: [tagEntities[4]], // Documentation
      },
    ];

    const projectEntities: any[] = [];
    for (const project of projects) {
      const result = await dataSource.query(
        `INSERT INTO projects (name, description, status, color, progress, "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [project.name, project.description, project.status, project.color, project.progress, project.owner.id]
      );
      
      const projectId = result[0].id;
      
      // Add members
      for (const member of project.members) {
        await dataSource.query(
          `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`,
          [projectId, member.id]
        );
      }
      
      // Add tags
      for (const tag of project.tags) {
        await dataSource.query(
          `INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2)`,
          [projectId, tag.id]
        );
      }
      
      projectEntities.push({ ...project, id: projectId });
      console.log(`  ✓ Created project: ${project.name}`);
    }

    // ============================================
    // 7. SEED TASKS
    // ============================================
    console.log('\n✅ Seeding Tasks...');
    
    const taskStatuses = ['todo', 'in-progress', 'in-review', 'done'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    
    const taskTemplates = [
      'Implement user authentication',
      'Design database schema',
      'Create API endpoints',
      'Write unit tests',
      'Setup CI/CD pipeline',
      'Optimize database queries',
      'Fix security vulnerabilities',
      'Update documentation',
      'Code review and refactoring',
      'Deploy to production',
      'Setup monitoring alerts',
      'Implement caching layer',
      'Create admin dashboard',
      'Mobile app integration',
      'Performance optimization',
    ];

    const taskEntities: any[] = [];
    for (const project of projectEntities) {
      // Create 3-5 tasks per project
      const taskCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < taskCount; i++) {
        const title = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
        const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const assignees = project.members.slice(0, Math.floor(Math.random() * 2) + 1);
        
        // Random due date in future (1-30 days)
        const daysUntilDue = Math.floor(Math.random() * 30) + 1;
        
        const result = await dataSource.query(
          `INSERT INTO tasks (title, description, status, priority, "projectId", "createdById", "dueDate", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '${daysUntilDue} days', NOW(), NOW())
           RETURNING id`,
          [
            title,
            `Task for ${project.name}: ${title}`,
            status,
            priority,
            project.id,
            project.owner.id,
          ]
        );
        
        const taskId = result[0].id;
        
        // Add assignees
        for (const assignee of assignees) {
          await dataSource.query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)`,
            [taskId, assignee.id]
          );
        }
        
        // Add 1-2 random tags
        // Add 1-2 random tags (ensure unique)
        const taskTags = [tagEntities[Math.floor(Math.random() * tagEntities.length)]];
        if (Math.random() > 0.5) {
          let secondTag;
          do {
            secondTag = tagEntities[Math.floor(Math.random() * tagEntities.length)];
          } while (secondTag.id === taskTags[0].id);
          taskTags.push(secondTag);
        }
        
        for (const tag of taskTags) {
          await dataSource.query(
            `INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)`,
            [taskId, tag.id]
          );
        }
        
        // Add 2-4 checklist items
        const checklistCount = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < checklistCount; j++) {
          const completed = Math.random() > 0.5;
          await dataSource.query(
            `INSERT INTO task_checklist_items ("taskId", title, completed, "order")
             VALUES ($1, $2, $3, $4)`,
            [taskId, `Checklist item ${j + 1} for ${title}`, completed, j]
          );
        }
        
        taskEntities.push({ id: taskId, projectId: project.id, assignees });
      }
      
      console.log(`  ✓ Created ${taskCount} tasks for project: ${project.name}`);
    }

    // ============================================
    // 8. SEED NOTES FOR ALL USERS
    // ============================================
    console.log('\n📝 Seeding Notes...');
    
    const noteTemplates = [
      { title: 'Meeting Notes', content: 'Important points discussed in today\'s meeting:\n- Project timeline\n- Resource allocation\n- Next steps' },
      { title: 'Ideas & Brainstorming', content: 'New feature ideas:\n1. User dashboard improvements\n2. Mobile app enhancements\n3. Integration with third-party services' },
      { title: 'Technical Documentation', content: '# API Documentation\n\n## Authentication\nUse Bearer token in Authorization header\n\n## Endpoints\n- GET /api/users\n- POST /api/projects' },
      { title: 'Daily Tasks', content: 'Today\'s to-do list:\n- [ ] Review pull requests\n- [ ] Update documentation\n- [ ] Team standup meeting\n- [ ] Code review' },
      { title: 'Bug Tracking', content: 'Known issues:\n1. Login page redirect issue\n2. Database connection timeout\n3. Mobile UI alignment' },
      { title: 'Research Notes', content: 'Technology research:\n- React Server Components\n- Next.js 14 features\n- Database optimization techniques' },
      { title: 'Project Requirements', content: 'Client requirements:\n- User authentication\n- Payment integration\n- Real-time notifications\n- Mobile responsiveness' },
      { title: 'Code Snippets', content: '```typescript\nconst fetchData = async () => {\n  const response = await fetch(\'/api/data\');\n  return response.json();\n};\n```' },
    ];

    for (const user of userEntities) {
      // Create 5-10 notes per user
      const noteCount = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < noteCount; i++) {
        const template = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
        const isPinned = Math.random() > 0.7;
        const isShared = Math.random() > 0.6;
        
        const result = await dataSource.query(
          `INSERT INTO notes (title, content, "isPinned", "createdById", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [template.title, template.content, isPinned, user.id]
        );
        
        const noteId = result[0].id;
        
        // Share with 1-2 random users if isShared
        if (isShared) {
          const shareWith = userEntities
            .filter(u => u.id !== user.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.floor(Math.random() * 2) + 1);
          
          for (const shareUser of shareWith) {
            await dataSource.query(
              `INSERT INTO note_shared_with (note_id, user_id) VALUES ($1, $2)`,
              [noteId, shareUser.id]
            );
          }
        }
      }
      
      console.log(`  ✓ Created ${noteCount} notes for user: ${user.name}`);
    }

    // ============================================
    // 9. SEED COMMENTS FOR TASKS
    // ============================================
    console.log('\n💬 Seeding Comments...');
    
    const commentTemplates = [
      'Looks good to me! ✓',
      'Can you add more details here?',
      'I think we should refactor this part',
      'Great work! 👍',
      'This needs more testing',
      'Documentation is missing',
      'Please review my changes',
      'Fixed the issue, ready for review',
      'Needs discussion in the next meeting',
      'Approved and merged',
    ];

    for (const task of taskEntities) {
      // Random 2-5 comments per task
      const commentCount = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < commentCount; i++) {
        const author = task.assignees[Math.floor(Math.random() * task.assignees.length)];
        const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
        
        const result = await dataSource.query(
          `INSERT INTO task_comments (content, \"taskId\", \"authorId\", \"createdAt\", \"updatedAt\")
           VALUES ($1, $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 48)} hours', NOW() - INTERVAL '${Math.floor(Math.random() * 48)} hours')
           RETURNING id`,
          [content, task.id, author.id]
        );
        
        // Random reactions (30% chance)
        if (Math.random() > 0.7) {
          const reactors = task.assignees.filter(a => a.id !== author.id);
          if (reactors.length > 0) {
            const reactor = reactors[Math.floor(Math.random() * reactors.length)];
            const emojis = ['👍', '❤️', '😄', '🎉', '🚀'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            await dataSource.query(
              `INSERT INTO comment_reactions (emoji, \"commentId\", \"userId\")
               VALUES ($1, $2, $3)`,
              [emoji, result[0].id, reactor.id]
            );
          }
        }
      }
    }
    
    console.log(`  ✓ Seeded comments for ${taskEntities.length} tasks`);

    // ============================================
    // 10. SEED NOTIFICATIONS
    // ============================================
    console.log('\n🔔 Seeding Notifications...');
    
    for (const user of userEntities) {
      // Create 5-10 notifications per user
      const notificationCount = Math.floor(Math.random() * 6) + 5;
      
      const types = ['task_assigned', 'task_updated', 'comment_added', 'mention', 'project_invite', 'task_due_soon'];
      
      for (let i = 0; i < notificationCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const isRead = Math.random() > 0.4;
        const hoursAgo = Math.floor(Math.random() * 72);
        
        let title = '';
        let message = '';
        
        switch (type) {
          case 'task_assigned':
            title = 'New Task Assigned';
            message = 'You have been assigned to a new task';
            break;
          case 'task_updated':
            title = 'Task Updated';
            message = 'A task you\'re working on has been updated';
            break;
          case 'comment_added':
            title = 'New Comment';
            message = 'Someone commented on your task';
            break;
          case 'mention':
            title = 'You were mentioned';
            message = 'Someone mentioned you in a comment';
            break;
          case 'project_invite':
            title = 'Project Invitation';
            message = 'You have been invited to join a project';
            break;
          case 'task_due_soon':
            title = 'Task Due Soon';
            message = 'A task is due in the next 24 hours';
            break;
        }
        
        await dataSource.query(
          `INSERT INTO notifications (title, message, type, "read", "userId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${hoursAgo} hours')`,
          [title, message, type, isRead, user.id]
        );
      }
      
      console.log(`  ✓ Created ${notificationCount} notifications for user: ${user.name}`);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✨ DATABASE SEEDING COMPLETED!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`  • Users: ${userEntities.length}`);
    console.log(`  • Roles: ${roleEntities.length}`);
    console.log(`  • Chat Rooms (1:1): ${chatRooms.length}`);
    console.log(`  • Projects: ${projectEntities.length}`);
    console.log(`  • Tasks: ${taskEntities.length}`);
    console.log(`  • Tags: ${tagEntities.length}`);
    console.log(`  • Notes: ${userEntities.length * 7} (avg)`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  Email: tt98tuyen@gmail.com`);
    console.log(`  Password: 123123123`);
    console.log(`\n💬 Chat Feature:`);
    console.log(`  • Every user can chat 1:1 with every other user`);
    console.log(`  • Total possible 1:1 chats: ${chatRooms.length}`);
    console.log(`  • Each chat has 5-10 messages with realistic timestamps`);
    console.log(`\n✅ All features are ready to test!\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run the seeding
seedComprehensiveData()
  .then(() => {
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
