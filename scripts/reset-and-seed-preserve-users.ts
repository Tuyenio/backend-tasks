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

    // Sample projects (expanded)
    const primaryUser = users[0];
    const projects = [
      {
        name: 'Dự án CRM nội bộ',
        description: 'Xây dựng hệ thống CRM quản lý khách hàng, quy trình bán hàng và chăm sóc sau bán hàng.',
        color: '#3b82f6',
        status: 'active',
        startDate: '2025-01-05',
        endDate: '2025-03-15',
        progress: 35,
        createdBy: primaryUser.id,
        memberIds: users.slice(0, 4).map((u: any) => u.id),
        tagNames: ['Backend', 'Frontend'],
      },
      {
        name: 'Website báo cáo phân tích',
        description: 'Trang dashboard phân tích số liệu hoạt động, hiệu suất và doanh thu theo thời gian thực.',
        color: '#8b5cf6',
        status: 'active',
        startDate: '2025-01-10',
        endDate: '2025-04-01',
        progress: 20,
        createdBy: users[1]?.id || primaryUser.id,
        memberIds: users.slice(1, 5).map((u: any) => u.id),
        tagNames: ['Báo cáo', 'Frontend'],
      },
      {
        name: 'Ứng dụng di động iOS/Android',
        description: 'Phát triển ứng dụng quản lý công việc cho nhân viên di động, đồng bộ real-time.',
        color: '#10b981',
        status: 'active',
        startDate: '2025-02-01',
        endDate: '2025-05-15',
        progress: 10,
        createdBy: users[2]?.id || primaryUser.id,
        memberIds: [users[0].id, users[2]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Frontend', 'Ưu tiên cao'],
      },
      {
        name: 'Hệ thống thanh toán trực tuyến',
        description: 'Tích hợp cổng thanh toán quốc tế, ví điện tử và thanh toán trả góp.',
        color: '#f59e0b',
        status: 'on-hold',
        startDate: '2025-03-01',
        endDate: '2025-06-30',
        progress: 5,
        createdBy: primaryUser.id,
        memberIds: [users[0].id, users[1]?.id].filter(Boolean),
        tagNames: ['Backend', 'Ưu tiên cao'],
      },
      {
        name: 'Nâng cấp hạ tầng và DevOps',
        description: 'Migrate sang Kubernetes, thiết lập CI/CD pipelines và monitoring toàn diện.',
        color: '#ef4444',
        status: 'completed',
        startDate: '2024-11-01',
        endDate: '2024-12-20',
        progress: 100,
        createdBy: users[1]?.id || primaryUser.id,
        memberIds: [users[1]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
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

    // Sample tasks (expanded to 15+ tasks across projects)
    const tasks = [
      // CRM Project tasks (6 tasks)
      {
        projectIndex: 0,
        title: 'Khảo sát yêu cầu nghiệp vụ CRM',
        description: 'Phỏng vấn các nhóm bán hàng, marketing để thu thập yêu cầu chức năng và phi chức năng cho hệ thống CRM.',
        status: 'done',
        priority: 'high',
        dueDate: '2025-01-20',
        estimatedHours: 24,
        createdBy: users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[2]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 0,
        title: 'Thiết kế kiến trúc dữ liệu CRM',
        description: 'Chuẩn hóa lược đồ, phân tích luồng dữ liệu khách hàng, đơn hàng, đề xuất migration strategy.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-02-05',
        estimatedHours: 32,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[1]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 0,
        title: 'Xây dựng API quản lý khách hàng',
        description: 'Implement REST API cho CRUD khách hàng, tìm kiếm, phân loại segment, export data.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-02-10',
        estimatedHours: 40,
        createdBy: users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[1]?.id].filter(Boolean),
        tagNames: ['Backend', 'Ưu tiên cao'],
      },
      {
        projectIndex: 0,
        title: 'Giao diện quản lý lead và pipeline',
        description: 'Thiết kế và code UI cho quản lý lead, pipeline bán hàng, drag-drop stage transitions.',
        status: 'review',
        priority: 'medium',
        dueDate: '2025-02-18',
        estimatedHours: 36,
        createdBy: users[2]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[3]?.id].filter(Boolean),
        tagNames: ['Frontend'],
      },
      {
        projectIndex: 0,
        title: 'Tích hợp email marketing automation',
        description: 'Kết nối với SendGrid/Mailchimp, thiết lập campaign tự động, tracking opens/clicks.',
        status: 'todo',
        priority: 'medium',
        dueDate: '2025-02-28',
        estimatedHours: 28,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[2]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 0,
        title: 'Testing và triển khai CRM pilot',
        description: 'Viết unit test, integration test, UAT với nhóm bán hàng, deploy staging environment.',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-03-10',
        estimatedHours: 48,
        createdBy: users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[1]?.id, users[2]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend', 'Frontend', 'Ưu tiên cao'],
      },

      // Analytics Dashboard tasks (4 tasks)
      {
        projectIndex: 1,
        title: 'Thiết kế dashboard KPI và metrics',
        description: 'Lên wireframe, mockup cho màn hình phân tích hiệu suất, chọn chart types phù hợp.',
        status: 'done',
        priority: 'medium',
        dueDate: '2025-02-15',
        estimatedHours: 18,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[3]?.id].filter(Boolean),
        tagNames: ['Frontend', 'Báo cáo'],
      },
      {
        projectIndex: 1,
        title: 'Kết nối nguồn dữ liệu analytics',
        description: 'Thiết lập ETL pipeline lấy dữ liệu hoạt động từ DB chính, cache Redis, aggregate hàng ngày.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-02-25',
        estimatedHours: 40,
        createdBy: users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[2]?.id, users[1]?.id].filter(Boolean),
        tagNames: ['Backend', 'Báo cáo'],
      },
      {
        projectIndex: 1,
        title: 'Implement interactive charts và filters',
        description: 'Code các biểu đồ tương tác, filter theo thời gian, nhóm, region, export PDF/Excel.',
        status: 'in_progress',
        priority: 'medium',
        dueDate: '2025-03-05',
        estimatedHours: 32,
        createdBy: users[3]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[3]?.id, users[4]?.id].filter(Boolean),
        tagNames: ['Frontend', 'Báo cáo'],
      },
      {
        projectIndex: 1,
        title: 'Tối ưu hiệu năng query và caching',
        description: 'Index database, optimize slow queries, implement Redis cache layer, CDN cho static assets.',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-03-20',
        estimatedHours: 24,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[2]?.id].filter(Boolean),
        tagNames: ['Backend', 'Ưu tiên cao'],
      },

      // Mobile App tasks (4 tasks)
      {
        projectIndex: 2,
        title: 'Setup React Native project structure',
        description: 'Khởi tạo project, cấu hình navigation, state management (Redux/Zustand), API client.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-02-10',
        estimatedHours: 20,
        createdBy: users[2]?.id || users[0].id,
        assignedBy: users[2]?.id || users[0].id,
        assigneeIds: [users[3]?.id].filter(Boolean),
        tagNames: ['Frontend'],
      },
      {
        projectIndex: 2,
        title: 'Thiết kế UI/UX cho mobile app',
        description: 'Figma design cho màn hình task list, detail, notifications, profile theo Material Design.',
        status: 'review',
        priority: 'medium',
        dueDate: '2025-02-18',
        estimatedHours: 24,
        createdBy: users[3]?.id || users[0].id,
        assignedBy: users[2]?.id || users[0].id,
        assigneeIds: [users[3]?.id].filter(Boolean),
        tagNames: ['Frontend'],
      },
      {
        projectIndex: 2,
        title: 'Implement real-time sync với WebSocket',
        description: 'Tích hợp Socket.IO cho đồng bộ task updates, notifications, chat messages real-time.',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-03-01',
        estimatedHours: 36,
        createdBy: users[2]?.id || users[0].id,
        assignedBy: users[2]?.id || users[0].id,
        assigneeIds: [users[2]?.id].filter(Boolean),
        tagNames: ['Frontend', 'Backend', 'Ưu tiên cao'],
      },
      {
        projectIndex: 2,
        title: 'Testing trên thiết bị iOS/Android',
        description: 'Test trên simulator và thiết bị thật, fix bugs UI, performance profiling, submit TestFlight.',
        status: 'todo',
        priority: 'medium',
        dueDate: '2025-05-10',
        estimatedHours: 40,
        createdBy: users[2]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[2]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Frontend'],
      },

      // Payment System tasks (2 tasks)
      {
        projectIndex: 3,
        title: 'Nghiên cứu và chọn payment gateway',
        description: 'So sánh Stripe, PayPal, VNPay, MoMo về phí, tính năng, compliance, chọn provider phù hợp.',
        status: 'done',
        priority: 'high',
        dueDate: '2025-03-05',
        estimatedHours: 16,
        createdBy: users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[1]?.id].filter(Boolean),
        tagNames: ['Backend', 'Ưu tiên cao'],
      },
      {
        projectIndex: 3,
        title: 'Implement payment processing API',
        description: 'Xây dựng API xử lý thanh toán, webhook handling, refund logic, transaction logging, PCI compliance.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-04-15',
        estimatedHours: 56,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[0].id,
        assigneeIds: [users[1]?.id].filter(Boolean),
        tagNames: ['Backend', 'Ưu tiên cao'],
      },

      // DevOps Upgrade tasks (3 tasks - completed project)
      {
        projectIndex: 4,
        title: 'Migration Docker sang Kubernetes',
        description: 'Viết K8s manifests, setup Helm charts, deploy lên staging cluster, test rollout/rollback.',
        status: 'done',
        priority: 'high',
        dueDate: '2024-11-20',
        estimatedHours: 48,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[1]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 4,
        title: 'Thiết lập CI/CD với GitHub Actions',
        description: 'Config workflows cho auto test, build, deploy staging/production, notifications khi fail.',
        status: 'done',
        priority: 'high',
        dueDate: '2024-12-05',
        estimatedHours: 32,
        createdBy: users[3]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
      },
      {
        projectIndex: 4,
        title: 'Deploy monitoring stack Prometheus + Grafana',
        description: 'Cài đặt monitoring, alerting rules, dashboards cho metrics CPU, memory, request latency, errors.',
        status: 'done',
        priority: 'medium',
        dueDate: '2024-12-18',
        estimatedHours: 24,
        createdBy: users[1]?.id || users[0].id,
        assignedBy: users[1]?.id || users[0].id,
        assigneeIds: [users[1]?.id, users[3]?.id].filter(Boolean),
        tagNames: ['Backend'],
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

    // Checklist items (3-4 items per task, varied completion)
    for (const [index, task] of taskEntities.entries()) {
      const numItems = 3 + (index % 2);
      const items: any[] = [];
      for (let i = 0; i < numItems; i++) {
        items.push(randomUUID(), task.id, `Item ${i + 1}: ${task.title.slice(0, 30)}`, i < numItems - 1, i + 1);
      }
      const placeholders = items.map((_, i) => `($${i + 1})`).join(', ');
      const valuesPerRow = 5;
      const rows: string[] = [];
      for (let i = 0; i < items.length; i += valuesPerRow) {
        rows.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
      }
      await dataSource.query(
        `INSERT INTO task_checklist_items (id, "taskId", title, completed, "order") VALUES ${rows.join(', ')}`,
        items
      );
    }

    // Reminders (2 reminders per in_progress/todo task)
    for (const task of taskEntities.slice(0, Math.min(10, taskEntities.length))) {
      const reminderDate1 = new Date();
      reminderDate1.setDate(reminderDate1.getDate() + 2);
      await dataSource.query(
        `INSERT INTO task_reminders (id, "taskId", "reminderDate", message, "isActive", "createdById", "createdAt") VALUES ($1, $2, $3, $4, true, $5, NOW())`,
        [randomUUID(), task.id, reminderDate1, `Nhắc: ${task.title}`, users[0].id]
      );
      if (task.id.length % 2 === 0) {
        const reminderDate2 = new Date();
        reminderDate2.setDate(reminderDate2.getDate() + 5);
        await dataSource.query(
          `INSERT INTO task_reminders (id, "taskId", "reminderDate", message, "isActive", "createdById", "createdAt") VALUES ($1, $2, $3, $4, true, $5, NOW())`,
          [randomUUID(), task.id, reminderDate2, `Deadline sắp tới: ${task.title}`, users[1]?.id || users[0].id]
        );
      }
    }

    // Attachments (multiple per task for first 8 tasks)
    const attachmentTypes = [
      { name: 'Yeu-cau-CRM.pdf', url: 'https://example.com/files/yeu-cau-crm.pdf', type: 'document', mime: 'application/pdf' },
      { name: 'Architecture-Diagram.png', url: 'https://example.com/files/arch.png', type: 'image', mime: 'image/png' },
      { name: 'API-Specs.docx', url: 'https://example.com/files/api-specs.docx', type: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'Design-Mockup.fig', url: 'https://example.com/files/mockup.fig', type: 'other', mime: 'application/octet-stream' },
      { name: 'Test-Results.xlsx', url: 'https://example.com/files/test-results.xlsx', type: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ];
    for (let i = 0; i < Math.min(8, taskEntities.length); i++) {
      const att = attachmentTypes[i % attachmentTypes.length];
      await dataSource.query(
        `INSERT INTO attachments (id, name, url, type, "mimeType", size, "taskId", "uploadedById", "uploadedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [randomUUID(), att.name, att.url, att.type, att.mime, 100000 + i * 10000, taskEntities[i].id, users[i % users.length].id]
      );
    }

    // Comments and reactions (10-15 comments across tasks)
    const commentContents = [
      'Cần ưu tiên luồng đăng nhập SSO trước.',
      'Đã review PR, có một số chỗ cần refactor.',
      'Thiết kế mockup rất đẹp, approved!',
      'Query này hơi chậm, cần thêm index.',
      'Có thể dùng Redis cache ở đây không?',
      'Unit test coverage đã đạt 85%, tốt rồi.',
      'Deadline sắp đến, cần hỗ trợ gì không?',
      'API response format chưa đúng chuẩn RESTful.',
      'UI trên mobile hơi nhỏ, tăng font size lên.',
      'Tài liệu này rất hữu ích, cảm ơn!',
    ];
    for (let i = 0; i < Math.min(10, taskEntities.length); i++) {
      const commentId = randomUUID();
      await dataSource.query(
        `INSERT INTO task_comments (id, content, "taskId", "authorId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [commentId, commentContents[i % commentContents.length], taskEntities[i].id, users[(i + 1) % users.length].id]
      );
      // Add 1-2 reactions per comment
      if (i % 2 === 0) {
        await dataSource.query(
          `INSERT INTO comment_reactions (id, "commentId", "userId", emoji) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), commentId, users[(i + 2) % users.length].id, ['👍', '❤️', '🎉', '👏'][i % 4]]
        );
      }
      if (i % 3 === 0) {
        await dataSource.query(
          `INSERT INTO comment_reactions (id, "commentId", "userId", emoji) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), commentId, users[(i + 3) % users.length].id, ['🚀', '💯', '🔥'][i % 3]]
        );
      }
    }

    // Notes and sharing (5 notes across projects)
    const noteData = [
      { title: 'Quy ước đặt tên API', content: 'Thống nhất đặt tên RESTful: GET /api/v1/resources, POST /api/v1/resources, PUT /api/v1/resources/:id, DELETE /api/v1/resources/:id. Versioning bắt đầu từ v1.', tags: 'API,Naming,Standards', projectIndex: 0, pinned: true, shared: true },
      { title: 'Database migration checklist', content: 'Trước khi chạy migration production: 1) Backup DB, 2) Test migration trên staging, 3) Review rollback script, 4) Thông báo downtime, 5) Monitor sau deploy.', tags: 'Database,Deployment', projectIndex: 0, pinned: true, shared: true },
      { title: 'Meeting notes - Sprint Planning', content: 'Sprint goal: Hoàn thành CRM MVP. Priorities: 1) API khách hàng, 2) UI lead management, 3) Email integration. Blockers: Chờ design approval.', tags: 'Meeting,Sprint', projectIndex: 0, pinned: false, shared: false },
      { title: 'Performance optimization tips', content: 'Database: Thêm index, optimize N+1 queries. Backend: Redis caching, CDN cho static files. Frontend: Code splitting, lazy loading, image optimization.', tags: 'Performance,Tips', projectIndex: 1, pinned: true, shared: true },
      { title: 'Security best practices', content: 'Authentication: JWT với refresh token rotation. Authorization: RBAC với permissions check. Input validation: Server-side validation bắt buộc. HTTPS only, CORS config cẩn thận.', tags: 'Security,Guidelines', projectIndex: 3, pinned: true, shared: true },
    ];
    for (const note of noteData) {
      const noteId = randomUUID();
      await dataSource.query(
        `INSERT INTO notes (id, title, content, tags, "isPinned", "isShared", "createdById", "projectId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [noteId, note.title, note.content, note.tags, note.pinned, note.shared, users[(noteData.indexOf(note)) % users.length].id, projectEntities[note.projectIndex]?.id]
      );
      if (note.shared) {
        // Share với 2-3 users
        for (let i = 1; i <= 2; i++) {
          await dataSource.query(
            `INSERT INTO note_shared_with (note_id, user_id) VALUES ($1, $2)`,
            [noteId, users[i % users.length].id]
          );
        }
      }
    }

    // Notifications (2-3 per user, varied types)
    const notifTypes = [
      { title: 'Chào mừng quay lại', message: 'Hệ thống đã được khởi tạo dữ liệu mẫu.', type: 'info', link: '/dashboard' },
      { title: 'Công việc mới được giao', message: 'Bạn được giao công việc "Thiết kế kiến trúc dữ liệu CRM".', type: 'task_assigned', link: '/tasks' },
      { title: 'Deadline sắp tới', message: 'Công việc "API quản lý khách hàng" sẽ hết hạn trong 2 ngày.', type: 'task_due_soon', link: '/tasks' },
      { title: 'Comment mới', message: 'Có người comment vào task của bạn.', type: 'comment', link: '/tasks' },
      { title: 'Dự án được cập nhật', message: 'Dự án "CRM nội bộ" đã được cập nhật tiến độ.', type: 'info', link: '/projects' },
    ];
    for (const user of users) {
      for (let i = 0; i < 3; i++) {
        const notif = notifTypes[i % notifTypes.length];
        await dataSource.query(
          `INSERT INTO notifications (id, title, message, type, read, link, "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [randomUUID(), notif.title, notif.message, notif.type, i === 0, notif.link, user.id]
        );
      }
    }

    // Create direct chats among all users
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

    // Add 2-3 group chats for projects
    for (let i = 0; i < Math.min(2, projectEntities.length); i++) {
      const chatId = randomUUID();
      await dataSource.query(
        `INSERT INTO chats (id, name, type, "createdAt", "updatedAt") VALUES ($1, $2, 'group', NOW(), NOW())`,
        [chatId, `${projectEntities[i].name} - Team Chat`]
      );
      for (const memberId of projectEntities[i].memberIds) {
        await dataSource.query(
          `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)`,
          [chatId, memberId]
        );
      }
      chatIds.push(chatId);
    }

    // Add 15-20 sample messages across chats
    const messageContents = [
      'Chào mọi người, bắt đầu sprint mới nhé!',
      'Meeting lúc 2pm hôm nay, mọi người note lại.',
      'PR đã merge, có thể pull code mới về test.',
      'Design đã approve, bắt đầu code được rồi.',
      'Có ai rảnh review PR này giúp mình không?',
      'Deploy staging thành công, mọi người test thử.',
      'Bug đã fix xong, closing ticket.',
      'Cần hỗ trợ về phần authentication.',
      'Documentation đã update ở wiki.',
      'Performance test results trông tốt.',
      'Có meeting notes không?',
      'Thanks team, làm tốt lắm!',
      'Standup lúc 9:30 sáng mai nhé.',
      'API endpoint mới: /api/v1/customers',
      'Cần review DB migration script.',
    ];
    for (let i = 0; i < Math.min(15, chatIds.length * 2); i++) {
      const chatId = chatIds[i % chatIds.length];
      const messageId = randomUUID();
      await dataSource.query(
        `INSERT INTO messages (id, content, type, "chatId", "senderId", "createdAt", "updatedAt") VALUES ($1, $2, 'text', $3, $4, NOW(), NOW())`,
        [messageId, messageContents[i % messageContents.length], chatId, users[i % users.length].id]
      );
      // Mark as read by 1-2 users
      if (i % 2 === 0) {
        await dataSource.query(
          `INSERT INTO message_read_status (message_id, user_id) VALUES ($1, $2)`,
          [messageId, users[(i + 1) % users.length].id]
        );
      }
    }
    console.log('💬 Created direct chats, group chats and sample messages');

    // Activity logs (12+ diverse activities)
    const activityActions = ['create', 'update', 'delete', 'assign', 'complete', 'comment', 'share'];
    const entityTypes = ['task', 'project', 'note', 'chat'];
    for (let i = 0; i < Math.min(12, taskEntities.length); i++) {
      await dataSource.query(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", metadata, "ipAddress", "projectId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          randomUUID(),
          users[i % users.length].id,
          activityActions[i % activityActions.length],
          entityTypes[i % entityTypes.length],
          taskEntities[i].id,
          JSON.stringify({ title: taskEntities[i].title, action: activityActions[i % activityActions.length] }),
          '127.0.0.1',
          taskEntities[i].projectId,
        ]
      );
    }

    // User sessions (1-2 per user)
    for (const user of users) {
      await dataSource.query(
        `INSERT INTO user_sessions (id, user_id, token, device, location, "ipAddress", "lastActiveAt", "createdAt", "expiresAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW() + INTERVAL '7 days')`,
        [randomUUID(), user.id, `token-${user.id}`, 'Chrome on Windows', 'VN', '127.0.0.1']
      );
      if (user.id.length % 2 === 0) {
        await dataSource.query(
          `INSERT INTO user_sessions (id, user_id, token, device, location, "ipAddress", "lastActiveAt", "createdAt", "expiresAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW() + INTERVAL '7 days')`,
          [randomUUID(), user.id, `token-mobile-${user.id}`, 'Safari on iPhone', 'VN', '192.168.1.100']
        );
      }
    }
    console.log('🧾 Seeded auxiliary data (checklists, reminders, attachments, notes, messages, logs)');

    console.log('🎉 Reset + seed completed (users preserved)');
  } catch (error) {
    console.error('❌ Error during reset seed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

resetAndSeedPreserveUsers();
