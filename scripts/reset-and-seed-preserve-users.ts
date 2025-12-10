import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

async function resetAndSeedPreserveUsers() {
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
    console.log('✅ Connected to database');

    const users = await dataSource.query('SELECT id, email, name FROM users');
    if (!users.length) {
      console.warn('⚠️ No users found. Aborting to preserve accounts.');
      return;
    }

    // Preserve current user->role mapping by name (fallback to member later)
    const userRolesRaw = await dataSource.query(
      `SELECT ur.user_id as "userId", r.name as "roleName"
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id`
    );
    const userRoleMap = new Map<string, string>();
    for (const row of userRolesRaw) {
      if (!userRoleMap.has(row.userId)) {
        userRoleMap.set(row.userId, row.roleName);
      }
    }

    console.log(`👥 Preserving ${users.length} users, role mappings for ${userRoleMap.size}`);

    // Wipe domain data but keep users
    const tablesToClear = [
      'message_read_status',
      'messages',
      'chat_members',
      'chats',
      'notifications',
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
      'activity_logs',
      'user_sessions',
      'user_roles',
      'roles',
    ];

    for (const table of tablesToClear) {
      await dataSource.query(`DELETE FROM ${table}`);
    }
    console.log('🧹 Cleared data tables (kept users)');

    // Seed roles with correct permissions format (comma-separated string for simple-array)
    const roles = [
      {
        name: 'super_admin',
        displayName: 'Quản trị tối cao',
        description: 'Toàn quyền hệ thống',
        permissions: ['*'],
        isSystemRole: true,
        color: '#6366f1',
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
        color: '#0ea5e9',
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
        color: '#22c55e',
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
        color: '#f97316',
      },
      {
        name: 'guest',
        displayName: 'Khách',
        description: 'Truy cập giới hạn (xem dự án, công việc, ghi chú)',
        permissions: ['projects.view', 'tasks.view', 'notes.view'],
        isSystemRole: true,
        color: '#64748b',
      },
    ];

    const roleEntities: { id: string; name: string }[] = [];
    for (const role of roles) {
      const permissionsValue = Array.isArray(role.permissions) ? role.permissions.join(',') : role.permissions;
      const result = await dataSource.query(
        `INSERT INTO roles (id, name, "displayName", description, permissions, "isSystem", color, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id`,
        [randomUUID(), role.name, role.displayName, role.description, permissionsValue, role.isSystemRole, role.color]
      );
      roleEntities.push({ id: result[0].id, name: role.name });
    }
    console.log('✅ Seeded roles');

    // Re-assign user roles based on preserved mapping (fallback: member)
    const memberRole = roleEntities.find((r) => r.name === 'member');
    for (const user of users) {
      const roleName = userRoleMap.get(user.id) || 'member';
      const role = roleEntities.find((r) => r.name === roleName) || memberRole;
      if (!role) continue;
      await dataSource.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [user.id, role.id]
      );
    }
    console.log('🔗 Re-linked users to roles');

    // Sample tags
    const tags = [
      { name: 'Ưu tiên cao', color: '#ef4444' },
      { name: 'Backend', color: '#6366f1' },
      { name: 'Frontend', color: '#22c55e' },
      { name: 'Báo cáo', color: '#f59e0b' },
    ];
    const tagEntities: { id: string; name: string }[] = [];
    for (const tag of tags) {
      const result = await dataSource.query(
        `INSERT INTO tags (id, name, color, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
        [randomUUID(), tag.name, tag.color]
      );
      tagEntities.push({ id: result[0].id, name: tag.name });
    }
    console.log('🏷️ Seeded tags');

    // Sample projects
    const primaryUser = users[0];
    const projects = [
      {
        name: 'Dự án CRM nội bộ',
        description: 'Xây dựng hệ thống CRM quản lý khách hàng và quy trình bán hàng.',
        color: '#3b82f6',
        status: 'active',
        startDate: '2025-01-05',
        endDate: '2025-03-15',
        progress: 35,
        createdBy: primaryUser.id,
        memberIds: users.slice(0, 3).map((u: any) => u.id),
        tagNames: ['Backend', 'Frontend'],
      },
      {
        name: 'Website báo cáo phân tích',
        description: 'Trang dashboard phân tích số liệu hoạt động và hiệu suất.',
        color: '#8b5cf6',
        status: 'active',
        startDate: '2025-01-10',
        endDate: '2025-04-01',
        progress: 20,
        createdBy: users[1]?.id || primaryUser.id,
        memberIds: users.slice(1, 4).map((u: any) => u.id),
        tagNames: ['Báo cáo', 'Frontend'],
      },
    ];

    const projectEntities: { id: string; name: string; memberIds: string[]; tagIds: string[] }[] = [];
    for (const project of projects) {
      const projectId = randomUUID();
      await dataSource.query(
        `INSERT INTO projects (id, name, description, color, status, "startDate", "endDate", deadline, progress, "createdAt", "updatedAt", "createdById")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)`,
        [
          projectId,
          project.name,
          project.description,
          project.color,
          project.status,
          project.startDate,
          project.endDate,
          project.endDate,
          project.progress,
          project.createdBy,
        ]
      );

      for (const userId of project.memberIds) {
        await dataSource.query(
          `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`,
          [projectId, userId]
        );
      }

      const tagIds: string[] = [];
      for (const tagName of project.tagNames) {
        const tag = tagEntities.find((t) => t.name === tagName);
        if (tag) {
          await dataSource.query(
            `INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2)`,
            [projectId, tag.id]
          );
          tagIds.push(tag.id);
        }
      }

      projectEntities.push({ id: projectId, name: project.name, memberIds: project.memberIds, tagIds });
    }
    console.log('📁 Seeded projects with members and tags');

    // Sample tasks
    const tasks = [
      {
        projectIndex: 0,
        title: 'Khảo sát yêu cầu nghiệp vụ',
        description: 'Phỏng vấn các nhóm bán hàng để thu thập yêu cầu CRM.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-01-20',
        estimatedHours: 24,
        createdBy: users[0].id,
        assignedBy: users[2]?.id || users[0].id,
        assigneeIds: [users[2]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 0,
        title: 'Thiết kế kiến trúc dữ liệu',
        description: 'Chuẩn hóa lược đồ, phân tích luồng dữ liệu, đề xuất migration.',
        status: 'review',
        priority: 'medium',
        dueDate: '2025-02-05',
        estimatedHours: 32,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[1]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 1,
        title: 'Thiết kế dashboard KPI',
        description: 'Lên wireframe cho màn hình phân tích hiệu suất.',
        status: 'in_progress',
        priority: 'medium',
        dueDate: '2025-02-15',
        estimatedHours: 18,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[3]?.id, users[4]?.id].filter(Boolean),
        tagNames: ['Frontend', 'Báo cáo'],
      },
      {
        projectIndex: 1,
        title: 'Kết nối nguồn dữ liệu',
        description: 'Thiết lập pipeline lấy dữ liệu hoạt động hàng ngày.',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-02-25',
        estimatedHours: 40,
        createdBy: users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[2]?.id],
        tagNames: ['Backend', 'Báo cáo'],
      },
    ];

    const taskEntities: { id: string; projectId: string; title: string }[] = [];
    for (const task of tasks) {
      const project = projectEntities[task.projectIndex];
      if (!project) continue;

      const taskId = randomUUID();
      await dataSource.query(
        `INSERT INTO tasks (id, title, description, status, priority, "dueDate", "estimatedHours", "commentsCount", "projectId", "createdAt", "updatedAt", "createdById", "assignedById")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, NOW(), NOW(), $9, $10)`,
        [
          taskId,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.dueDate,
          task.estimatedHours,
          project.id,
          task.createdBy,
          task.assignedBy,
        ]
      );

      taskEntities.push({ id: taskId, projectId: project.id, title: task.title });

      for (const userId of task.assigneeIds) {
        await dataSource.query(
          `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)`,
          [taskId, userId]
        );
      }

      for (const tagName of task.tagNames) {
        const tag = tagEntities.find((t) => t.name === tagName);
        if (tag) {
          await dataSource.query(
            `INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)`,
            [taskId, tag.id]
          );
        }
      }
    }
    console.log('✅ Seeded sample tasks');

    // Checklist items
    for (const [index, task] of taskEntities.entries()) {
      await dataSource.query(
        `INSERT INTO task_checklist_items (id, "taskId", title, completed, "order") VALUES ($1, $2, $3, $4, $5), ($6, $2, $7, $8, $9)`,
        [
          randomUUID(),
          task.id,
          `Checklist ${index + 1} - 1`,
          index % 2 === 0,
          1,
          randomUUID(),
          `Checklist ${index + 1} - 2`,
          false,
          2,
        ]
      );
    }

    // Reminders
    for (const task of taskEntities) {
      await dataSource.query(
        `INSERT INTO task_reminders (id, "taskId", "reminderDate", message, "isActive", "createdById", "createdAt") VALUES ($1, $2, $3, $4, true, $5, NOW())`,
        [randomUUID(), task.id, new Date(), `Nhắc nhở cho ${task.title}`, users[0].id]
      );
    }

    // Attachments (first task)
    if (taskEntities[0]) {
      await dataSource.query(
        `INSERT INTO attachments (id, name, url, type, "mimeType", size, "taskId", "uploadedById", "uploadedAt")
         VALUES ($1, $2, $3, 'document', 'application/pdf', 102400, $4, $5, NOW())`,
        [randomUUID(), 'Yeu-cau-CRM.pdf', 'https://example.com/files/yeu-cau-crm.pdf', taskEntities[0].id, users[1].id]
      );
    }

    // Comments and reactions
    if (taskEntities[0]) {
      const commentId = randomUUID();
      await dataSource.query(
        `INSERT INTO task_comments (id, content, "taskId", "authorId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [commentId, 'Cần ưu tiên luồng đăng nhập SSO.', taskEntities[0].id, users[2].id]
      );
      await dataSource.query(
        `INSERT INTO comment_reactions (id, "commentId", "userId", emoji) VALUES ($1, $2, $3, $4)`,
        [randomUUID(), commentId, users[0].id, '👍']
      );
    }

    // Notes and sharing
    const noteId = randomUUID();
    await dataSource.query(
      `INSERT INTO notes (id, title, content, tags, "isPinned", "isShared", "createdById", "projectId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, true, $5, $6, NOW(), NOW())`,
      [noteId, 'Quy ước đặt tên API', 'Thống nhất đặt tên RESTful và versioning.', 'API,Naming', users[1].id, projectEntities[0]?.id]
    );
    if (users[2]) {
      await dataSource.query(
        `INSERT INTO note_shared_with (note_id, user_id) VALUES ($1, $2)`,
        [noteId, users[2].id]
      );
    }

    // Notifications
    for (const user of users) {
      await dataSource.query(
        `INSERT INTO notifications (id, title, message, type, read, link, "userId", "createdAt") VALUES ($1, $2, $3, 'info', false, $4, $5, NOW())`,
        [randomUUID(), 'Chào mừng quay lại', 'Hệ thống đã được khởi tạo dữ liệu mẫu.', '/dashboard', user.id]
      );
    }

    // Create direct chats among all users and sample messages
    const chatIds: string[] = [];
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const chatId = randomUUID();
        await dataSource.query(
          `INSERT INTO chats (id, type, "createdAt", "updatedAt") VALUES ($1, 'direct', NOW(), NOW())`,
          [chatId]
        );
        await dataSource.query(
          `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
          [chatId, users[i].id, users[j].id]
        );
        chatIds.push(chatId);
      }
    }

    if (chatIds[0]) {
      const messageId1 = randomUUID();
      await dataSource.query(
        `INSERT INTO messages (id, content, type, "chatId", "senderId", "createdAt", "updatedAt") VALUES ($1, $2, 'text', $3, $4, NOW(), NOW())`,
        [messageId1, 'Chào mọi người, bắt đầu sprint mới nhé!', chatIds[0], users[0].id]
      );
      await dataSource.query(
        `INSERT INTO message_read_status (message_id, user_id) VALUES ($1, $2)`,
        [messageId1, users[1].id]
      );
    }
    console.log('💬 Created direct chats and sample messages');

    // Activity logs
    if (taskEntities[0]) {
      await dataSource.query(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", metadata, "ipAddress", "projectId", "createdAt")
         VALUES ($1, $2, 'create', 'task', $3, $4, '127.0.0.1', $5, NOW())`,
        [
          randomUUID(),
          users[0].id,
          taskEntities[0].id,
          JSON.stringify({ title: taskEntities[0].title }),
          taskEntities[0].projectId,
        ]
      );
    }

    // User sessions
    for (const user of users) {
      await dataSource.query(
        `INSERT INTO user_sessions (id, user_id, token, device, location, "ipAddress", "lastActiveAt", "createdAt", "expiresAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW() + INTERVAL '7 days')`,
        [randomUUID(), user.id, `token-${user.id}`, 'Chrome on Windows', 'VN', '127.0.0.1']
      );
    }
    console.log('🧾 Seeded auxiliary data (checklists, reminders, attachments, notes, messages, logs)');

    console.log('💬 Created direct chats between all users');

    console.log('🎉 Reset + seed completed (users preserved)');
  } catch (error) {
    console.error('❌ Error during reset seed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

resetAndSeedPreserveUsers();
