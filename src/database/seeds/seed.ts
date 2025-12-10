import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { Tag } from '../../entities/tag.entity';
import { Project } from '../../entities/project.entity';
import { Task, TaskStatus, TaskPriority } from '../../entities/task.entity';
import { Note } from '../../entities/note.entity';
import { Chat, ChatType } from '../../entities/chat.entity';
import { Message, MessageType } from '../../entities/message.entity';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { SystemSetting } from '../../entities/system-setting.entity';
import { Comment } from '../../entities/comment.entity';
import { ChecklistItem } from '../../entities/checklist-item.entity';
import { ActivityLog, ActivityAction, ActivityEntityType } from '../../entities/activity-log.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { Theme } from '../../entities/theme.entity';
import { Attachment } from '../../entities/attachment.entity';
import dataSource from '../data-source';

// All permissions matching FE types
const ALL_PERMISSIONS = [
  'projects.create',
  'projects.update',
  'projects.delete',
  'projects.view',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'tasks.view',
  'tasks.assign',
  'tasks.complete',
  'notes.create',
  'notes.update',
  'notes.delete',
  'notes.view',
  'chat.create',
  'chat.send',
  'chat.delete',
  'reports.view',
  'reports.export',
  'reports.create',
  'users.view',
  'users.manage',
  'users.invite',
  'roles.view',
  'roles.manage',
  'roles.create',
  'roles.delete',
  'settings.view',
  'settings.manage',
  'team.view',
  'team.manage',
];

async function seed() {
  try {
    await dataSource.initialize();
    console.log('🔗 Database connected');

    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);
    const tagRepository = dataSource.getRepository(Tag);
    const projectRepository = dataSource.getRepository(Project);
    const taskRepository = dataSource.getRepository(Task);
    const noteRepository = dataSource.getRepository(Note);
    const chatRepository = dataSource.getRepository(Chat);
    const messageRepository = dataSource.getRepository(Message);
    const notificationRepository = dataSource.getRepository(Notification);
    const systemSettingRepository = dataSource.getRepository(SystemSetting);
    const commentRepository = dataSource.getRepository(Comment);
    const checklistItemRepository = dataSource.getRepository(ChecklistItem);
    const activityLogRepository = dataSource.getRepository(ActivityLog);
    const attachmentRepository = dataSource.getRepository(Attachment);
    const userSettingsRepository = dataSource.getRepository(UserSettings);
    const themeRepository = dataSource.getRepository(Theme);

    // ========== SEED ROLES ==========
    console.log('\n📋 Seeding Roles...');

    const rolesData = [
      {
        name: 'super_admin',
        displayName: 'Super Admin',
        description:
          'Quyền tối cao - Toàn quyền quản lý hệ thống, cấu hình, người dùng và tất cả tính năng. Có thể tạo, sửa, xóa mọi thứ.',
        permissions: ALL_PERMISSIONS,
        isSystem: true,
        color: '#ef4444',
      },
      {
        name: 'admin',
        displayName: 'Admin',
        description:
          'Quản lý người dùng, dự án và cài đặt hệ thống. Có quyền tạo, sửa, xóa hầu hết các tài nguyên.',
        permissions: [
          'projects.create',
          'projects.update',
          'projects.delete',
          'projects.view',
          'tasks.create',
          'tasks.update',
          'tasks.delete',
          'tasks.view',
          'tasks.assign',
          'tasks.complete',
          'notes.create',
          'notes.update',
          'notes.delete',
          'notes.view',
          'chat.create',
          'chat.send',
          'reports.view',
          'reports.export',
          'reports.create',
          'users.view',
          'users.manage',
          'users.invite',
          'roles.view',
          'settings.view',
          'team.view',
          'team.manage',
        ],
        isSystem: true,
        color: '#f59e0b',
      },
      {
        name: 'manager',
        displayName: 'Manager',
        description:
          'Quản lý dự án và nhóm. Có quyền tạo, sửa dự án, giao việc và theo dõi tiến độ. Xem báo cáo và xuất dữ liệu.',
        permissions: [
          'projects.create',
          'projects.update',
          'projects.view',
          'tasks.create',
          'tasks.update',
          'tasks.delete',
          'tasks.view',
          'tasks.assign',
          'tasks.complete',
          'notes.create',
          'notes.update',
          'notes.view',
          'chat.create',
          'chat.send',
          'reports.view',
          'reports.export',
          'reports.create',
          'users.view',
          'users.invite',
          'team.view',
          'team.manage',
        ],
        isSystem: true,
        color: '#3b82f6',
      },
      {
        name: 'member',
        displayName: 'Member',
        description:
          'Thành viên có thể xem và thực hiện các công việc được giao. Có thể tạo ghi chú và tham gia trò chuyện.',
        permissions: [
          'projects.view',
          'tasks.create',
          'tasks.update',
          'tasks.view',
          'tasks.complete',
          'notes.create',
          'notes.update',
          'notes.view',
          'chat.send',
          'users.view',
          'team.view',
        ],
        isSystem: true,
        color: '#10b981',
      },
      {
        name: 'guest',
        displayName: 'Guest',
        description:
          'Khách chỉ có quyền xem. Có thể xem dự án, công việc và ghi chú được chia sẻ nhưng không thể chỉnh sửa.',
        permissions: [
          'projects.view',
          'tasks.view',
          'notes.view',
          'users.view',
          'team.view',
        ],
        isSystem: true,
        color: '#64748b',
      },
    ];

    const roles: Role[] = [];
    for (const roleData of rolesData) {
      let role = await roleRepository.findOne({
        where: { name: roleData.name },
      });
      if (!role) {
        role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`✅ Created role: ${roleData.displayName}`);
      } else {
        console.log(`⏭️  Role already exists: ${roleData.displayName}`);
      }
      roles.push(role);
    }

    // ========== SEED USERS ==========
    console.log('\n👥 Seeding Users...');

    const usersData = [
      {
        email: 'tt98tuyen@gmail.com',
        password: '123123123',
        name: 'Nguyễn Văn Tuyên',
        roleName: 'super_admin',
        phone: '+84912345601',
        bio: 'Super Admin - Quản trị viên hệ thống',
        department: 'IT',
        jobRole: 'System Administrator',
      },
      {
        email: 'tuyenkoikop@gmail.com',
        password: '123123123',
        name: 'Trần Thị Admin',
        roleName: 'admin',
        phone: '+84912345602',
        bio: 'Admin - Quản lý hệ thống',
        department: 'IT',
        jobRole: 'Administrator',
      },
      {
        email: 'nnt11032003@gmail.com',
        password: '123123123',
        name: 'Lê Văn Manager',
        roleName: 'manager',
        phone: '+84912345603',
        bio: 'Manager - Quản lý dự án',
        department: 'Product',
        jobRole: 'Project Manager',
      },
      {
        email: 'nguyenngoctuyen11032003@gmail.com',
        password: '123123123',
        name: 'Phạm Thị Member',
        roleName: 'member',
        phone: '+84912345604',
        bio: 'Member - Thành viên',
        department: 'Development',
        jobRole: 'Developer',
      },
      {
        email: 'nnt1132003@gmail.com',
        password: '123123123',
        name: 'Hoàng Văn Guest',
        roleName: 'guest',
        phone: '+84912345605',
        bio: 'Guest - Khách',
        department: 'External',
        jobRole: 'Guest User',
      },
    ];

    const users: User[] = [];
    for (const userData of usersData) {
      let user = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!user) {
        const role = roles.find((r) => r.name === userData.roleName);
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        user = userRepository.create({
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          phone: userData.phone,
          bio: userData.bio,
          department: userData.department,
          jobRole: userData.jobRole,
          roles: [role!],
          isActive: true,
          isLocked: false,
          emailVerified: true,
        });

        await userRepository.save(user);
        console.log(`✅ Created user: ${userData.email} (${userData.roleName})`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
      users.push(user);
    }

    // ========== SEED TAGS ==========
    console.log('\n🏷️  Seeding Tags...');

    const tagsData = [
      { name: 'urgent', color: '#ef4444' },
      { name: 'bug', color: '#dc2626' },
      { name: 'feature', color: '#3b82f6' },
      { name: 'enhancement', color: '#10b981' },
      { name: 'documentation', color: '#8b5cf6' },
      { name: 'design', color: '#ec4899' },
      { name: 'backend', color: '#f59e0b' },
      { name: 'frontend', color: '#06b6d4' },
      { name: 'devops', color: '#8b5cf6' },
      { name: 'database', color: '#10b981' },
      { name: 'security', color: '#ec4899' },
      { name: 'testing', color: '#14b8a6' },
      { name: 'mobile', color: '#06b6d4' },
      { name: 'api', color: '#8b5cf6' },
      { name: 'ui-ux', color: '#f43f5e' },
      { name: 'performance', color: '#22c55e' },
      { name: 'infrastructure', color: '#64748b' },
      { name: 'analytics', color: '#a855f7' },
      { name: 'integration', color: '#0ea5e9' },
      { name: 'refactor', color: '#8b5cf6' },
    ];

    const tags: Tag[] = [];
    for (const tagData of tagsData) {
      let tag = await tagRepository.findOne({ where: { name: tagData.name } });
      if (!tag) {
        tag = tagRepository.create(tagData);
        await tagRepository.save(tag);
        console.log(`✅ Created tag: ${tagData.name}`);
      }
      tags.push(tag);
    }

    // ========== SEED PROJECTS ==========
    console.log('\n📁 Seeding Projects...');

    const projectsData = [
      {
        name: 'Website Redesign',
        description:
          'Thiết kế lại toàn bộ giao diện website công ty với UI/UX hiện đại',
        color: '#3b82f6',
        status: 'active' as const,
        progress: 65,
        startDate: new Date('2024-01-01'),
        deadline: new Date('2024-12-31'),
        createdBy: users[0],
        members: [users[0], users[1], users[2], users[3]],
        tags: [tags[0], tags[2], tags[7]],
      },
      {
        name: 'Mobile App Development',
        description: 'Phát triển ứng dụng di động iOS và Android',
        color: '#10b981',
        status: 'active' as const,
        progress: 40,
        startDate: new Date('2024-02-01'),
        deadline: new Date('2025-03-31'),
        createdBy: users[1],
        members: [users[1], users[2], users[3]],
        tags: [tags[2], tags[6], tags[7]],
      },
      {
        name: 'Marketing Campaign Q4',
        description: 'Chiến dịch marketing quý 4 năm 2024',
        color: '#f59e0b',
        status: 'completed' as const,
        progress: 100,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        deadline: new Date('2024-12-31'),
        createdBy: users[2],
        members: [users[2], users[3]],
        tags: [tags[3], tags[4]],
      },
      {
        name: 'Blog Platform',
        description: 'Xây dựng nền tảng blog với CMS tích hợp',
        color: '#8b5cf6',
        status: 'active' as const,
        progress: 30,
        startDate: new Date('2024-12-01'),
        deadline: new Date('2025-06-30'),
        createdBy: users[1],
        members: [users[1], users[3]],
        tags: [tags[2], tags[7]],
      },
      {
        name: 'E-commerce Platform',
        description: 'Xây dựng nền tảng thương mại điện tử đầy đủ',
        color: '#ec4899',
        status: 'active' as const,
        progress: 50,
        startDate: new Date('2024-10-01'),
        deadline: new Date('2025-08-31'),
        createdBy: users[2],
        members: [users[1], users[2], users[3]],
        tags: [tags[2], tags[3], tags[13]],
      },
      {
        name: 'Data Analytics Dashboard',
        description: 'Tạo dashboard phân tích dữ liệu realtime',
        color: '#06b6d4',
        status: 'active' as const,
        progress: 25,
        startDate: new Date('2024-11-15'),
        deadline: new Date('2025-05-31'),
        createdBy: users[0],
        members: [users[0], users[2]],
        tags: [tags[17], tags[15]],
      },
      {
        name: 'AI Chatbot Integration',
        description: 'Tích hợp AI chatbot sử dụng GPT-4 cho customer support',
        color: '#a855f7',
        status: 'active' as const,
        progress: 20,
        startDate: new Date('2024-11-01'),
        deadline: new Date('2025-04-30'),
        createdBy: users[0],
        members: [users[0], users[1], users[3]],
        tags: [tags[2], tags[13], tags[18]],
      },
      {
        name: 'IoT Smart Home System',
        description: 'Hệ thống quản lý nhà thông minh kết nối IoT devices',
        color: '#22c55e',
        status: 'active' as const,
        progress: 35,
        startDate: new Date('2024-09-15'),
        deadline: new Date('2025-07-31'),
        createdBy: users[1],
        members: [users[1], users[2], users[3]],
        tags: [tags[2], tags[6], tags[16]],
      },
      {
        name: 'Cloud Migration AWS',
        description: 'Di chuyển toàn bộ infrastructure sang AWS cloud',
        color: '#f59e0b',
        status: 'active' as const,
        progress: 55,
        startDate: new Date('2024-08-01'),
        deadline: new Date('2025-02-28'),
        createdBy: users[0],
        members: [users[0], users[1]],
        tags: [tags[8], tags[16]],
      },
      {
        name: 'Data Warehouse Implementation',
        description: 'Xây dựng data warehouse với BigQuery và ETL pipelines',
        color: '#0ea5e9',
        status: 'active' as const,
        progress: 45,
        startDate: new Date('2024-10-15'),
        deadline: new Date('2025-06-30'),
        createdBy: users[2],
        members: [users[0], users[2]],
        tags: [tags[9], tags[17]],
      },
      {
        name: 'CRM System Upgrade',
        description: 'Nâng cấp hệ thống CRM với tính năng automation và AI insights',
        color: '#ec4899',
        status: 'active' as const,
        progress: 60,
        startDate: new Date('2024-07-01'),
        deadline: new Date('2025-01-31'),
        createdBy: users[1],
        members: [users[1], users[2], users[3]],
        tags: [tags[2], tags[3], tags[13]],
      },
      {
        name: 'ERP System Implementation',
        description: 'Triển khai hệ thống ERP cho quản lý toàn diện doanh nghiệp',
        color: '#8b5cf6',
        status: 'active' as const,
        progress: 30,
        startDate: new Date('2024-09-01'),
        deadline: new Date('2025-12-31'),
        createdBy: users[0],
        members: [users[0], users[1], users[2], users[3]],
        tags: [tags[2], tags[6], tags[9]],
      },
      {
        name: 'Blockchain DeFi Platform',
        description: 'Xây dựng nền tảng DeFi trên Ethereum với smart contracts',
        color: '#14b8a6',
        status: 'active' as const,
        progress: 15,
        startDate: new Date('2024-11-20'),
        deadline: new Date('2025-09-30'),
        createdBy: users[0],
        members: [users[0], users[3]],
        tags: [tags[2], tags[10], tags[6]],
      },
      {
        name: 'Gaming Platform Development',
        description: 'Phát triển nền tảng game online multiplayer với Unity',
        color: '#f43f5e',
        status: 'active' as const,
        progress: 40,
        startDate: new Date('2024-08-15'),
        deadline: new Date('2025-10-31'),
        createdBy: users[1],
        members: [users[1], users[2], users[3]],
        tags: [tags[2], tags[5], tags[15]],
      },
      {
        name: 'Healthcare Management System',
        description: 'Hệ thống quản lý bệnh viện với EMR và telemedicine',
        color: '#10b981',
        status: 'active' as const,
        progress: 50,
        startDate: new Date('2024-06-01'),
        deadline: new Date('2025-05-31'),
        createdBy: users[2],
        members: [users[0], users[2], users[3]],
        tags: [tags[2], tags[10], tags[9]],
      },
      {
        name: 'Financial Dashboard BI',
        description: 'Dashboard tài chính với Business Intelligence và real-time analytics',
        color: '#3b82f6',
        status: 'active' as const,
        progress: 70,
        startDate: new Date('2024-05-01'),
        deadline: new Date('2025-01-15'),
        createdBy: users[0],
        members: [users[0], users[1], users[2]],
        tags: [tags[17], tags[15], tags[13]],
      },
      {
        name: 'Mobile Payment Gateway',
        description: 'Cổng thanh toán di động tích hợp multiple payment methods',
        color: '#f59e0b',
        status: 'completed' as const,
        progress: 100,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-11-30'),
        deadline: new Date('2024-11-30'),
        createdBy: users[1],
        members: [users[1], users[3]],
        tags: [tags[12], tags[10], tags[13]],
      },
    ];

    const projects: Project[] = [];
    for (const projectData of projectsData) {
      const project = projectRepository.create({
        ...projectData,
        status: projectData.status as any,
      });
      await projectRepository.save(project);
      projects.push(project);
      console.log(`✅ Created project: ${projectData.name}`);
    }

    // ========== SEED TASKS ==========
    console.log('\n✅ Seeding Tasks...');

    const tasksData = [
      // Website Redesign tasks
      {
        title: 'Thiết kế mockup trang chủ',
        description: 'Tạo mockup cho trang chủ mới với Figma',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-01-15'),
        estimatedHours: 16,
        project: projects[0],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[5], tags[7]],
      },
      {
        title: 'Implement responsive navbar',
        description: 'Code navbar responsive cho mobile và desktop',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-12-15'),
        estimatedHours: 8,
        project: projects[0],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[7]],
      },
      {
        title: 'API Integration',
        description: 'Tích hợp API backend với frontend',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-12-20'),
        estimatedHours: 24,
        project: projects[0],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[0], tags[6]],
      },
      {
        title: 'Database optimization',
        description: 'Optimize database queries và add indexes',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-25'),
        estimatedHours: 20,
        project: projects[0],
        createdBy: users[0],
        assignees: [users[1], users[3]],
        tags: [tags[9], tags[15]],
      },
      {
        title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions cho automated testing và deployment',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-30'),
        estimatedHours: 16,
        project: projects[0],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[8], tags[16]],
      },
      {
        title: 'Write API documentation',
        description: 'Document tất cả API endpoints với Swagger/OpenAPI',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-05'),
        estimatedHours: 12,
        project: projects[0],
        createdBy: users[2],
        assignees: [users[0]],
        tags: [tags[4]],
      },
      {
        title: 'User authentication flow',
        description: 'Implement JWT token management và refresh tokens',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-12-22'),
        estimatedHours: 18,
        project: projects[0],
        createdBy: users[0],
        assignees: [users[1], users[2]],
        tags: [tags[0], tags[10]],
      },
      {
        title: 'Performance monitoring setup',
        description: 'Integrate Sentry và performance monitoring tools',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-26'),
        estimatedHours: 8,
        project: projects[0],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[15]],
      },
      {
        title: 'Security audit',
        description: 'Thực hiện comprehensive security audit và fix vulnerabilities',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-12-24'),
        estimatedHours: 24,
        project: projects[0],
        createdBy: users[0],
        assignees: [users[1], users[2], users[3]],
        tags: [tags[0], tags[10]],
      },
      {
        title: 'API rate limiting',
        description: 'Implement rate limiting để prevent abuse',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-27'),
        estimatedHours: 10,
        project: projects[0],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[0], tags[10]],
      },

      // Mobile App Development tasks
      {
        title: 'Setup Firebase',
        description: 'Cấu hình Firebase cho push notification',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-10'),
        estimatedHours: 12,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[2], tags[12]],
      },
      {
        title: 'Design app icon và splash screen',
        description: 'Thiết kế icon và màn hình khởi động cho app',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-11-30'),
        estimatedHours: 6,
        project: projects[1],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[5]],
      },
      {
        title: 'Email notification system',
        description: 'Setup email notifications cho task updates và assignments',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-08'),
        estimatedHours: 14,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[2], tags[6]],
      },
      {
        title: 'Mobile UI testing',
        description: 'Test mobile responsive design trên various devices',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-12-28'),
        estimatedHours: 10,
        project: projects[1],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[11], tags[12]],
      },
      {
        title: 'Analytics integration',
        description: 'Integrate Google Analytics và custom event tracking',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: new Date('2025-01-15'),
        estimatedHours: 12,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[17]],
      },
      {
        title: 'User profile customization',
        description: 'Cho phép users customize profile và preferences',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-12'),
        estimatedHours: 14,
        project: projects[1],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[14]],
      },
      {
        title: 'Offline mode implementation',
        description: 'Implement offline sync với local storage',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-20'),
        estimatedHours: 20,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[12], tags[15]],
      },
      {
        title: 'In-app purchases',
        description: 'Setup in-app purchases cho premium features',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-15'),
        estimatedHours: 16,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[12], tags[13]],
      },

      // Marketing Campaign tasks
      {
        title: 'Social media strategy',
        description: 'Lập kế hoạch chiến lược social media cho Q4',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-10-15'),
        estimatedHours: 12,
        project: projects[2],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[3]],
      },
      {
        title: 'Content creation',
        description: 'Tạo content cho các kênh marketing',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-11-30'),
        estimatedHours: 40,
        project: projects[2],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[4]],
      },

      // Blog Platform tasks
      {
        title: 'Setup blog database schema',
        description: 'Design database cho blog posts, comments, categories',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-30'),
        estimatedHours: 16,
        project: projects[3],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[9], tags[6]],
      },
      {
        title: 'Create blog editor component',
        description: 'Build rich text editor cho blog posts với markdown support',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-15'),
        estimatedHours: 20,
        project: projects[3],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[7], tags[14]],
      },
      {
        title: 'SEO optimization',
        description: 'Implement SEO best practices và meta tags',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-01'),
        estimatedHours: 10,
        project: projects[3],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[3]],
      },
      {
        title: 'Comment system với reactions',
        description: 'Build comment system có reactions và threading',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-15'),
        estimatedHours: 18,
        project: projects[3],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[2], tags[7]],
      },

      // E-commerce Platform tasks
      {
        title: 'Product catalog system',
        description: 'Implement product listing, search, và filtering',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-12-28'),
        estimatedHours: 24,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[1], users[3]],
        tags: [tags[0], tags[9]],
      },
      {
        title: 'Shopping cart và checkout',
        description: 'Implement cart management và secure checkout flow',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2025-01-10'),
        estimatedHours: 28,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[1]],
        tags: [tags[0], tags[10]],
      },
      {
        title: 'Payment gateway integration',
        description: 'Tích hợp Stripe, PayPal, VNPay payment gateways',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2025-01-20'),
        estimatedHours: 30,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[1]],
        tags: [tags[13], tags[10]],
      },
      {
        title: 'Order management system',
        description: 'Build order tracking và management system',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-02-01'),
        estimatedHours: 22,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[6], tags[9]],
      },
      {
        title: 'Inventory management',
        description: 'Implement inventory tracking và stock alerts',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-02-10'),
        estimatedHours: 20,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[1]],
        tags: [tags[9]],
      },
      {
        title: 'Product reviews và ratings',
        description: 'Build review system với ratings và photos',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-03-01'),
        estimatedHours: 16,
        project: projects[4],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[2], tags[14]],
      },

      // Analytics Dashboard tasks
      {
        title: 'Design dashboard layouts',
        description: 'Create wireframes và designs cho dashboard views',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-12-20'),
        estimatedHours: 12,
        project: projects[5],
        createdBy: users[0],
        assignees: [users[2]],
        tags: [tags[5], tags[14]],
      },
      {
        title: 'Implement data visualization',
        description: 'Add charts, graphs, và data visualization components',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-20'),
        estimatedHours: 18,
        project: projects[5],
        createdBy: users[0],
        assignees: [users[2]],
        tags: [tags[17], tags[7]],
      },
      {
        title: 'Real-time data streaming',
        description: 'Implement WebSocket cho real-time data updates',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-02-01'),
        estimatedHours: 20,
        project: projects[5],
        createdBy: users[0],
        assignees: [users[2]],
        tags: [tags[15], tags[6]],
      },

      // AI Chatbot Integration tasks
      {
        title: 'Research GPT-4 API',
        description: 'Nghiên cứu và test GPT-4 API capabilities',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-11-15'),
        estimatedHours: 16,
        project: projects[6],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[2], tags[13]],
      },
      {
        title: 'Build conversation engine',
        description: 'Xây dựng conversation management engine',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-30'),
        estimatedHours: 24,
        project: projects[6],
        createdBy: users[0],
        assignees: [users[1], users[3]],
        tags: [tags[6], tags[13]],
      },
      {
        title: 'Training data preparation',
        description: 'Chuẩn bị và xử lý training data cho chatbot',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-15'),
        estimatedHours: 20,
        project: projects[6],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[2]],
      },
      {
        title: 'Chat UI component',
        description: 'Thiết kế và build chat interface component',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-01'),
        estimatedHours: 16,
        project: projects[6],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[14], tags[7]],
      },

      // IoT Smart Home System tasks
      {
        title: 'IoT device protocol research',
        description: 'Nghiên cứu MQTT, CoAP protocols cho IoT',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-10-15'),
        estimatedHours: 12,
        project: projects[7],
        createdBy: users[1],
        assignees: [users[2]],
        tags: [tags[2], tags[16]],
      },
      {
        title: 'Device management API',
        description: 'Build API cho device registration và management',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-30'),
        estimatedHours: 20,
        project: projects[7],
        createdBy: users[1],
        assignees: [users[2], users[3]],
        tags: [tags[13], tags[6]],
      },
      {
        title: 'Real-time monitoring dashboard',
        description: 'Dashboard hiển thị real-time status của devices',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-20'),
        estimatedHours: 18,
        project: projects[7],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[17], tags[7]],
      },
      {
        title: 'Automation rules engine',
        description: 'Build rules engine cho device automation',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-02-15'),
        estimatedHours: 24,
        project: projects[7],
        createdBy: users[1],
        assignees: [users[2]],
        tags: [tags[6], tags[2]],
      },

      // Cloud Migration AWS tasks
      {
        title: 'AWS infrastructure planning',
        description: 'Lập kế hoạch infrastructure trên AWS',
        status: TaskStatus.DONE,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-08-30'),
        estimatedHours: 16,
        project: projects[8],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[8], tags[16]],
      },
      {
        title: 'Setup VPC và networking',
        description: 'Configure VPC, subnets, security groups',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-10-15'),
        estimatedHours: 12,
        project: projects[8],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[16], tags[10]],
      },
      {
        title: 'Database migration',
        description: 'Migrate databases sang AWS RDS',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-12-30'),
        estimatedHours: 30,
        project: projects[8],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[9], tags[8]],
      },
      {
        title: 'Setup monitoring và alerting',
        description: 'Configure CloudWatch monitoring và alerts',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-15'),
        estimatedHours: 14,
        project: projects[8],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[8], tags[15]],
      },

      // Data Warehouse Implementation tasks
      {
        title: 'BigQuery schema design',
        description: 'Design data warehouse schema trong BigQuery',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-11-15'),
        estimatedHours: 20,
        project: projects[9],
        createdBy: users[2],
        assignees: [users[0]],
        tags: [tags[9], tags[17]],
      },
      {
        title: 'ETL pipeline development',
        description: 'Build ETL pipelines với Apache Airflow',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-10'),
        estimatedHours: 32,
        project: projects[9],
        createdBy: users[2],
        assignees: [users[0]],
        tags: [tags[9], tags[6]],
      },
      {
        title: 'Data quality monitoring',
        description: 'Implement data quality checks và monitoring',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-01'),
        estimatedHours: 16,
        project: projects[9],
        createdBy: users[2],
        assignees: [users[0]],
        tags: [tags[17], tags[15]],
      },

      // CRM System Upgrade tasks
      {
        title: 'Customer 360 view',
        description: 'Build comprehensive customer profile view',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-12-28'),
        estimatedHours: 22,
        project: projects[10],
        createdBy: users[1],
        assignees: [users[2], users[3]],
        tags: [tags[7], tags[9]],
      },
      {
        title: 'AI-powered lead scoring',
        description: 'Implement AI model cho lead scoring',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-01-30'),
        estimatedHours: 24,
        project: projects[10],
        createdBy: users[1],
        assignees: [users[2]],
        tags: [tags[2], tags[17]],
      },
      {
        title: 'Email campaign automation',
        description: 'Build automated email campaign workflows',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-02-15'),
        estimatedHours: 18,
        project: projects[10],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[3], tags[18]],
      },

      // ERP System Implementation tasks
      {
        title: 'Requirements analysis',
        description: 'Phân tích requirements từ các departments',
        status: TaskStatus.DONE,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-10-15'),
        estimatedHours: 40,
        project: projects[11],
        createdBy: users[0],
        assignees: [users[1], users[2]],
        tags: [tags[4]],
      },
      {
        title: 'Financial module',
        description: 'Develop accounting và financial management module',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-03-31'),
        estimatedHours: 80,
        project: projects[11],
        createdBy: users[0],
        assignees: [users[1], users[2], users[3]],
        tags: [tags[6], tags[9]],
      },
      {
        title: 'HR module',
        description: 'Develop HR management và payroll module',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-06-30'),
        estimatedHours: 60,
        project: projects[11],
        createdBy: users[0],
        assignees: [users[2]],
        tags: [tags[6], tags[9]],
      },
      {
        title: 'Inventory module',
        description: 'Develop inventory và warehouse management',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-09-30'),
        estimatedHours: 50,
        project: projects[11],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[6], tags[9]],
      },

      // Blockchain DeFi Platform tasks
      {
        title: 'Smart contract development',
        description: 'Develop Solidity smart contracts cho DeFi protocols',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-31'),
        estimatedHours: 60,
        project: projects[12],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[2], tags[10]],
      },
      {
        title: 'Security audit preparation',
        description: 'Chuẩn bị cho security audit smart contracts',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2025-03-15'),
        estimatedHours: 40,
        project: projects[12],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[10], tags[11]],
      },
      {
        title: 'Web3 wallet integration',
        description: 'Integrate MetaMask và WalletConnect',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-04-30'),
        estimatedHours: 24,
        project: projects[12],
        createdBy: users[0],
        assignees: [users[3]],
        tags: [tags[18], tags[10]],
      },

      // Gaming Platform Development tasks
      {
        title: 'Game engine setup',
        description: 'Setup Unity game engine và project structure',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-09-30'),
        estimatedHours: 16,
        project: projects[13],
        createdBy: users[1],
        assignees: [users[2]],
        tags: [tags[2]],
      },
      {
        title: 'Multiplayer networking',
        description: 'Implement multiplayer networking với Photon',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-31'),
        estimatedHours: 40,
        project: projects[13],
        createdBy: users[1],
        assignees: [users[2], users[3]],
        tags: [tags[2], tags[15]],
      },
      {
        title: 'Character system',
        description: 'Develop character creation và customization',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-03-31'),
        estimatedHours: 32,
        project: projects[13],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[5], tags[2]],
      },
      {
        title: 'Game economy',
        description: 'Design và implement in-game economy',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-05-31'),
        estimatedHours: 28,
        project: projects[13],
        createdBy: users[1],
        assignees: [users[2]],
        tags: [tags[9]],
      },

      // Healthcare Management System tasks
      {
        title: 'EMR database design',
        description: 'Design Electronic Medical Records database',
        status: TaskStatus.DONE,
        priority: TaskPriority.URGENT,
        dueDate: new Date('2024-07-31'),
        estimatedHours: 30,
        project: projects[14],
        createdBy: users[2],
        assignees: [users[0]],
        tags: [tags[9], tags[10]],
      },
      {
        title: 'Patient portal',
        description: 'Build patient portal cho appointment booking',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-31'),
        estimatedHours: 36,
        project: projects[14],
        createdBy: users[2],
        assignees: [users[3]],
        tags: [tags[7], tags[10]],
      },
      {
        title: 'Telemedicine module',
        description: 'Implement video consultation feature',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-03-31'),
        estimatedHours: 40,
        project: projects[14],
        createdBy: users[2],
        assignees: [users[0], users[3]],
        tags: [tags[2], tags[18]],
      },

      // Financial Dashboard BI tasks
      {
        title: 'KPI metrics definition',
        description: 'Define các KPI metrics cần tracking',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-06-15'),
        estimatedHours: 12,
        project: projects[15],
        createdBy: users[0],
        assignees: [users[1]],
        tags: [tags[17]],
      },
      {
        title: 'Real-time data pipeline',
        description: 'Build real-time data ingestion pipeline',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2024-09-30'),
        estimatedHours: 32,
        project: projects[15],
        createdBy: users[0],
        assignees: [users[1], users[2]],
        tags: [tags[9], tags[15]],
      },
      {
        title: 'Interactive charts',
        description: 'Build interactive financial charts với drill-down',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2024-12-31'),
        estimatedHours: 24,
        project: projects[15],
        createdBy: users[0],
        assignees: [users[2]],
        tags: [tags[17], tags[7]],
      },
    ];

    const tasks: Task[] = [];
    for (const taskData of tasksData) {
      const task = taskRepository.create(taskData);
      await taskRepository.save(task);
      tasks.push(task);
      console.log(`✅ Created task: ${taskData.title}`);
    }

    // ========== SEED COMMENTS ==========
    console.log('\n💬 Seeding Comments...');
    
    const commentsData = [
      { task: tasks[0], author: users[0], content: 'Mockup đã hoàn thành, chờ feedback từ team design' },
      { task: tasks[0], author: users[1], content: 'Mockup trông rất đẹp, recommend approve' },
      { task: tasks[0], author: users[3], content: 'Đã áp dụng feedback, chuẩn bị cho implementation' },
      { task: tasks[1], author: users[3], content: 'Đang code navbar, progress khoảng 70%' },
      { task: tasks[1], author: users[1], content: 'Nhớ test responsive trên iPad nữa nhé' },
      { task: tasks[2], author: users[2], content: 'Cần thảo luận thêm về API architecture' },
      { task: tasks[2], author: users[0], content: 'Đã schedule meeting lúc 2PM để discuss' },
      { task: tasks[10], author: users[1], content: 'Firebase setup hoàn thành, ready for testing' },
      { task: tasks[10], author: users[3], content: 'Đã test push notification, working perfectly' },
      { task: tasks[3], author: users[1], content: 'Đã add composite indexes cho frequently queried columns' },
      { task: tasks[3], author: users[0], content: 'Performance cải thiện 60%, great job!' },
      { task: tasks[6], author: users[0], content: 'JWT implementation đã hoàn thiện, cần review security' },
      { task: tasks[8], author: users[1], content: 'Đã fix 3 critical vulnerabilities, còn 2 medium' },
      { task: tasks[24], author: users[2], content: 'Product catalog có search và filter rất mượt' },
      { task: tasks[24], author: users[1], content: 'Cần optimize query cho pagination' },
      { task: tasks[25], author: users[1], content: 'Shopping cart đã implement Redux state management' },
      { task: tasks[40], author: users[0], content: 'Smart contracts đã pass initial testing' },
      { task: tasks[40], author: users[3], content: 'Cần thêm event logging cho tracking' },
      { task: tasks[47], author: users[2], content: 'Patient portal UI đã hoàn thành' },
      { task: tasks[47], author: users[3], content: 'Đang integrate với EMR system' },
      { task: tasks[50], author: users[2], content: 'Dashboard charts render rất nhanh với 1M records' },
      { task: tasks[33], author: users[1], content: 'Conversation engine handle được 1000 concurrent users' },
      { task: tasks[35], author: users[2], content: 'IoT devices respond trong <100ms, excellent!' },
      { task: tasks[30], author: users[0], content: 'Real-time data streaming working smoothly' },
    ];

    for (const commentData of commentsData) {
      const comment = commentRepository.create({
        content: commentData.content,
        task: commentData.task,
        author: commentData.author,
      });
      await commentRepository.save(comment);
    }
    console.log(`✅ Created ${commentsData.length} comments`);

    // ========== SEED CHECKLISTS ==========
    console.log('\n✅ Seeding Checklist Items...');
    
    const checklistsData = [
      { 
        task: tasks[0], 
        items: [
          { title: 'Design lo-fi wireframes', completed: true },
          { title: 'Create hi-fi mockup', completed: true },
          { title: 'Get stakeholder approval', completed: true },
          { title: 'Export assets', completed: false },
        ]
      },
      { 
        task: tasks[1], 
        items: [
          { title: 'Mobile layout', completed: true },
          { title: 'Tablet layout', completed: true },
          { title: 'Desktop layout', completed: false },
          { title: 'Test responsiveness', completed: false },
        ]
      },
      { 
        task: tasks[2], 
        items: [
          { title: 'Setup API client', completed: false },
          { title: 'Integrate auth endpoints', completed: false },
          { title: 'Integrate task endpoints', completed: false },
          { title: 'Error handling', completed: false },
        ]
      },
      { 
        task: tasks[10], 
        items: [
          { title: 'Create Firebase project', completed: true },
          { title: 'Setup authentication', completed: true },
          { title: 'Configure notifications', completed: true },
        ]
      },
      { 
        task: tasks[4], 
        items: [
          { title: 'Setup GitHub Actions', completed: false },
          { title: 'Configure test pipeline', completed: false },
          { title: 'Setup deployment pipeline', completed: false },
          { title: 'Add status badges', completed: false },
        ]
      },
      { 
        task: tasks[24], 
        items: [
          { title: 'Product listing page', completed: true },
          { title: 'Search functionality', completed: true },
          { title: 'Filter by category', completed: false },
          { title: 'Sort options', completed: false },
          { title: 'Pagination', completed: false },
        ]
      },
      { 
        task: tasks[25], 
        items: [
          { title: 'Add to cart', completed: false },
          { title: 'Update quantity', completed: false },
          { title: 'Remove items', completed: false },
          { title: 'Calculate totals', completed: false },
          { title: 'Checkout flow', completed: false },
        ]
      },
      { 
        task: tasks[33], 
        items: [
          { title: 'Message parsing', completed: true },
          { title: 'Context management', completed: true },
          { title: 'Response generation', completed: false },
          { title: 'Conversation history', completed: false },
        ]
      },
      { 
        task: tasks[40], 
        items: [
          { title: 'ERC-20 token contract', completed: true },
          { title: 'Liquidity pool contract', completed: false },
          { title: 'Staking contract', completed: false },
          { title: 'Governance contract', completed: false },
        ]
      },
      {
        task: tasks[47],
        items: [
          { title: 'Patient registration', completed: true },
          { title: 'Appointment booking', completed: true },
          { title: 'Medical history view', completed: false },
          { title: 'Prescription download', completed: false },
        ]
      },
    ];

    let checklistCount = 0;
    for (const checklistData of checklistsData) {
      for (let i = 0; i < checklistData.items.length; i++) {
        const checklistItem = checklistItemRepository.create({
          title: checklistData.items[i].title,
          completed: checklistData.items[i].completed,
          task: checklistData.task,
          order: i,
        });
        await checklistItemRepository.save(checklistItem);
        checklistCount++;
      }
    }
    console.log(`✅ Created ${checklistCount} checklist items`);

    // ========== SEED ATTACHMENTS ==========
    console.log('\n📎 Seeding Attachments...');
    
    const attachmentsData = [
      { task: tasks[0], name: 'mockup-homepage-v2.fig', url: '/uploads/attachments/mockup-homepage-v2.fig', size: 2456789, mimeType: 'application/octet-stream', uploadedBy: users[3] },
      { task: tasks[0], name: 'design-specs.pdf', url: '/uploads/attachments/design-specs.pdf', size: 1234567, mimeType: 'application/pdf', uploadedBy: users[3] },
      { task: tasks[1], name: 'navbar-components.tsx', url: '/uploads/attachments/navbar-components.tsx', size: 45678, mimeType: 'text/plain', uploadedBy: users[3] },
      { task: tasks[2], name: 'api-documentation.md', url: '/uploads/attachments/api-documentation.md', size: 89012, mimeType: 'text/markdown', uploadedBy: users[2] },
      { task: tasks[3], name: 'database-indexes.sql', url: '/uploads/attachments/database-indexes.sql', size: 12345, mimeType: 'text/plain', uploadedBy: users[1] },
      { task: tasks[8], name: 'security-audit-report.pdf', url: '/uploads/attachments/security-audit-report.pdf', size: 3456789, mimeType: 'application/pdf', uploadedBy: users[1] },
      { task: tasks[10], name: 'firebase-config.json', url: '/uploads/attachments/firebase-config.json', size: 5678, mimeType: 'application/json', uploadedBy: users[3] },
      { task: tasks[24], name: 'product-catalog-schema.png', url: '/uploads/attachments/product-catalog-schema.png', size: 567890, mimeType: 'image/png', uploadedBy: users[1] },
      { task: tasks[25], name: 'checkout-flow-diagram.pdf', url: '/uploads/attachments/checkout-flow-diagram.pdf', size: 890123, mimeType: 'application/pdf', uploadedBy: users[1] },
      { task: tasks[33], name: 'chatbot-training-data.csv', url: '/uploads/attachments/chatbot-training-data.csv', size: 12345678, mimeType: 'text/csv', uploadedBy: users[1] },
      { task: tasks[40], name: 'smart-contract-audit.pdf', url: '/uploads/attachments/smart-contract-audit.pdf', size: 2345678, mimeType: 'application/pdf', uploadedBy: users[3] },
      { task: tasks[47], name: 'patient-portal-wireframes.fig', url: '/uploads/attachments/patient-portal-wireframes.fig', size: 3456789, mimeType: 'application/octet-stream', uploadedBy: users[3] },
    ];

    for (const attachmentData of attachmentsData) {
      const attachment = attachmentRepository.create(attachmentData);
      await attachmentRepository.save(attachment);
    }
    console.log(`✅ Created ${attachmentsData.length} attachments`);

    // ========== SEED ACTIVITY LOGS ==========
    console.log('\n📊 Seeding Activity Logs...');
    
    const activityLogsData = [
      { user: users[0], action: ActivityAction.CREATE, entityType: ActivityEntityType.PROJECT, entityId: projects[0].id.toString(), description: 'Created project "Website Redesign"', metadata: { projectName: 'Website Redesign' } },
      { user: users[0], action: ActivityAction.CREATE, entityType: ActivityEntityType.TASK, entityId: tasks[0].id.toString(), description: 'Created task "Thiết kế mockup trang chủ"', metadata: { taskTitle: 'Thiết kế mockup trang chủ' } },
      { user: users[3], action: ActivityAction.UPDATE, entityType: ActivityEntityType.TASK, entityId: tasks[0].id.toString(), description: 'Updated task status to DONE', metadata: { oldStatus: 'IN_PROGRESS', newStatus: 'DONE' } },
      { user: users[0], action: ActivityAction.ASSIGN, entityType: ActivityEntityType.TASK, entityId: tasks[1].id.toString(), description: 'Assigned task to Phạm Thị Member', metadata: { assignee: 'Phạm Thị Member' } },
      { user: users[3], action: ActivityAction.COMPLETE, entityType: ActivityEntityType.TASK, entityId: tasks[11].id.toString(), description: 'Completed task "Design app icon và splash screen"', metadata: { taskTitle: 'Design app icon và splash screen' } },
      { user: users[0], action: ActivityAction.COMMENT, entityType: ActivityEntityType.TASK, entityId: tasks[0].id.toString(), description: 'Commented on task "Thiết kế mockup trang chủ"', metadata: { comment: 'Mockup đã hoàn thành' } },
      { user: users[1], action: ActivityAction.CREATE, entityType: ActivityEntityType.PROJECT, entityId: projects[1].id.toString(), description: 'Created project "Mobile App Development"', metadata: { projectName: 'Mobile App Development' } },
      { user: users[2], action: ActivityAction.UPDATE, entityType: ActivityEntityType.PROJECT, entityId: projects[2].id.toString(), description: 'Completed project "Marketing Campaign Q4"', metadata: { status: 'completed' } },
      { user: users[1], action: ActivityAction.DELETE, entityType: ActivityEntityType.TASK, entityId: tasks[5].id.toString(), description: 'Deleted a comment on task', metadata: { reason: 'duplicate' } },
      { user: users[0], action: ActivityAction.CREATE, entityType: ActivityEntityType.PROJECT, entityId: projects[6].id.toString(), description: 'Created project "AI Chatbot Integration"', metadata: { projectName: 'AI Chatbot Integration' } },
      { user: users[2], action: ActivityAction.ASSIGN, entityType: ActivityEntityType.TASK, entityId: tasks[24].id.toString(), description: 'Assigned task to multiple users', metadata: { assignees: ['Trần Thị Admin', 'Phạm Thị Member'] } },
      { user: users[1], action: ActivityAction.UPDATE, entityType: ActivityEntityType.TASK, entityId: tasks[8].id.toString(), description: 'Changed priority to URGENT', metadata: { oldPriority: 'HIGH', newPriority: 'URGENT' } },
      { user: users[0], action: ActivityAction.CREATE, entityType: ActivityEntityType.TASK, entityId: tasks[40].id.toString(), description: 'Created task "Smart contract development"', metadata: { taskTitle: 'Smart contract development' } },
      { user: users[3], action: ActivityAction.COMMENT, entityType: ActivityEntityType.TASK, entityId: tasks[40].id.toString(), description: 'Added comment with code review', metadata: { commentType: 'code_review' } },
      { user: users[2], action: ActivityAction.COMPLETE, entityType: ActivityEntityType.TASK, entityId: tasks[18].id.toString(), description: 'Completed marketing task', metadata: { completedDate: '2024-11-30' } },
    ];

    for (const activityLogData of activityLogsData) {
      const activityLog = activityLogRepository.create(activityLogData);
      await activityLogRepository.save(activityLog);
    }
    console.log(`✅ Created ${activityLogsData.length} activity logs`);

    // ========== SEED NOTES ==========
    console.log('\n📝 Seeding Notes...');

    const notesData = [
      {
        title: 'Meeting Notes - Kickoff',
        content:
          '# Kickoff Meeting\n\n- Đã thống nhất timeline dự án\n- Phân công nhiệm vụ cho từng thành viên\n- Next meeting: 15/12/2024',
        tags: ['meeting', 'important'],
        isPinned: true,
        isShared: true,
        createdBy: users[0],
        project: projects[0],
        sharedWith: [users[1], users[2]],
      },
      {
        title: 'Design Guidelines',
        content:
          '## Colors\n- Primary: #3b82f6\n- Secondary: #10b981\n\n## Fonts\n- Heading: Inter Bold\n- Body: Inter Regular',
        tags: ['design', 'reference'],
        isPinned: false,
        isShared: true,
        createdBy: users[3],
        project: projects[0],
        sharedWith: [users[0], users[1]],
      },
      {
        title: 'API Endpoints',
        content:
          '# Backend APIs\n\n- GET /api/users\n- POST /api/projects\n- PATCH /api/tasks/:id',
        tags: ['backend', 'documentation'],
        isPinned: true,
        isShared: false,
        createdBy: users[1],
        project: projects[0],
        sharedWith: [],
      },
      {
        title: 'Sprint Planning Q1 2025',
        content:
          '# Sprint Planning\n\n## Goals\n- Complete mobile app MVP\n- Launch beta testing\n\n## Key Tasks\n- Push notifications\n- Offline mode\n- Performance optimization',
        tags: ['planning', 'sprint'],
        isPinned: true,
        isShared: true,
        createdBy: users[1],
        project: projects[1],
        sharedWith: [users[2], users[3]],
      },
      {
        title: 'Database Migration Notes',
        content:
          '# Migration Plan\n\n1. Backup existing data\n2. Run migration scripts\n3. Verify data integrity\n4. Update connection strings\n5. Monitor performance',
        tags: ['database', 'migration'],
        isPinned: false,
        isShared: true,
        createdBy: users[0],
        project: projects[8],
        sharedWith: [users[1]],
      },
      {
        title: 'AI Model Training Results',
        content:
          '# Training Results\n\n- Accuracy: 94.5%\n- Precision: 92.3%\n- Recall: 91.8%\n- F1 Score: 92.0%\n\nModel ready for production deployment',
        tags: ['ai', 'machine-learning'],
        isPinned: true,
        isShared: true,
        createdBy: users[0],
        project: projects[6],
        sharedWith: [users[1], users[3]],
      },
      {
        title: 'Security Best Practices',
        content:
          '# Security Checklist\n\n- [ ] Input validation\n- [ ] SQL injection prevention\n- [ ] XSS protection\n- [ ] CSRF tokens\n- [ ] Rate limiting\n- [ ] Encryption at rest',
        tags: ['security', 'checklist'],
        isPinned: true,
        isShared: true,
        createdBy: users[0],
        project: projects[0],
        sharedWith: [users[1], users[2], users[3]],
      },
      {
        title: 'IoT Device Protocols',
        content:
          '# Supported Protocols\n\n## MQTT\n- Lightweight messaging\n- Pub/Sub model\n\n## CoAP\n- RESTful protocol for IoT\n- UDP based',
        tags: ['iot', 'protocols'],
        isPinned: false,
        isShared: true,
        createdBy: users[1],
        project: projects[7],
        sharedWith: [users[2], users[3]],
      },
      {
        title: 'E-commerce Payment Integration',
        content:
          '# Payment Gateways\n\n1. Stripe - International\n2. PayPal - Global\n3. VNPay - Vietnam\n4. Momo - Vietnam Mobile\n\n## Testing Credentials\n- Available in secure vault',
        tags: ['payment', 'integration'],
        isPinned: false,
        isShared: true,
        createdBy: users[2],
        project: projects[4],
        sharedWith: [users[1]],
      },
      {
        title: 'Performance Optimization Tips',
        content:
          '# Optimization Strategies\n\n- Database indexing\n- Query optimization\n- Caching (Redis)\n- CDN for static assets\n- Code splitting\n- Lazy loading',
        tags: ['performance', 'optimization'],
        isPinned: true,
        isShared: true,
        createdBy: users[1],
        project: projects[0],
        sharedWith: [users[0], users[3]],
      },
      {
        title: 'Blockchain Smart Contract Audit',
        content:
          '# Audit Checklist\n\n- Reentrancy protection\n- Integer overflow/underflow\n- Access control\n- Gas optimization\n- Event logging\n\nAudit scheduled: Jan 15, 2025',
        tags: ['blockchain', 'security'],
        isPinned: true,
        isShared: true,
        createdBy: users[0],
        project: projects[12],
        sharedWith: [users[3]],
      },
      {
        title: 'Healthcare Compliance Requirements',
        content:
          '# HIPAA Compliance\n\n- Patient data encryption\n- Access logging\n- Data retention policies\n- Breach notification\n- BAA agreements',
        tags: ['healthcare', 'compliance'],
        isPinned: true,
        isShared: true,
        createdBy: users[2],
        project: projects[14],
        sharedWith: [users[0], users[3]],
      },
      {
        title: 'Gaming Platform Architecture',
        content:
          '# System Architecture\n\n## Components\n- Game Server (Photon)\n- Auth Service\n- Matchmaking Service\n- Leaderboard Service\n- In-app Purchase Service',
        tags: ['architecture', 'gaming'],
        isPinned: false,
        isShared: true,
        createdBy: users[1],
        project: projects[13],
        sharedWith: [users[2], users[3]],
      },
    ];

    for (const noteData of notesData) {
      const note = noteRepository.create(noteData);
      await noteRepository.save(note);
    }
    console.log(`✅ Created ${notesData.length} notes`);

    // ========== SEED CHATS ==========
    console.log('\n💬 Seeding Chats...');

    const chatsData = [
      {
        name: 'Team Website Redesign',
        type: ChatType.GROUP,
        members: [users[0], users[1], users[2], users[3]],
      },
      {
        name: undefined, // Direct chat
        type: ChatType.DIRECT,
        members: [users[0], users[1]],
      },
      {
        name: 'Mobile Dev Team',
        type: ChatType.GROUP,
        members: [users[1], users[2], users[3]],
      },
      {
        name: undefined, // Direct chat
        type: ChatType.DIRECT,
        members: [users[2], users[3]],
      },
      {
        name: 'AI/ML Research',
        type: ChatType.GROUP,
        members: [users[0], users[1], users[3]],
      },
      {
        name: undefined, // Direct chat
        type: ChatType.DIRECT,
        members: [users[0], users[3]],
      },
      {
        name: 'E-commerce Team',
        type: ChatType.GROUP,
        members: [users[1], users[2], users[3]],
      },
    ];

    const chats: Chat[] = [];
    for (const chatData of chatsData) {
      const chat = chatRepository.create({
        name: chatData.name,
        type: chatData.type,
        members: chatData.members,
      });
      await chatRepository.save(chat);
      chats.push(chat);
    }
    console.log(`✅ Created ${chats.length} chats`);

    // ========== SEED MESSAGES ==========
    console.log('\n💬 Seeding Messages...');

    const messagesData = [
      {
        content: 'Chào mọi người! Bắt đầu dự án nào 🚀',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[0],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Tôi đã upload mockup lên Figma rồi nhé!',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[3],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Link Figma: https://figma.com/file/abc123',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[3],
        readBy: [users[0], users[1], users[2], users[3]],
      },
      {
        content: 'Mockup trông rất đẹp, approve luôn!',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[1],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Hi, có thể review code của em không?',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[1],
        readBy: [users[0], users[1]],
      },
      {
        content: 'OK, gửi PR link đi',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[0],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Mobile app build sẵn sàng cho testing',
        type: MessageType.TEXT,
        chat: chats[2],
        sender: users[1],
        readBy: [users[1], users[2]],
      },
      {
        content: 'Firebase push notification đã test OK',
        type: MessageType.TEXT,
        chat: chats[2],
        sender: users[3],
        readBy: [users[1], users[2], users[3]],
      },
      {
        content: 'Cần help với responsive design không?',
        type: MessageType.TEXT,
        chat: chats[2],
        sender: users[2],
        readBy: [users[1], users[2], users[3]],
      },
      {
        content: 'Yes please! Đang stuck ở tablet layout',
        type: MessageType.TEXT,
        chat: chats[2],
        sender: users[3],
        readBy: [users[2], users[3]],
      },
      {
        content: 'API documentation đã update chưa?',
        type: MessageType.TEXT,
        chat: chats[3],
        sender: users[2],
        readBy: [users[2], users[3]],
      },
      {
        content: 'Rồi, check Swagger UI nhé',
        type: MessageType.TEXT,
        chat: chats[3],
        sender: users[3],
        readBy: [users[2], users[3]],
      },
      {
        content: 'AI model training hoàn thành! Accuracy 94.5%',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[0],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Impressive! Ready for production?',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[1],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Cần test thêm với real data, nhưng promising',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[0],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'GPT-4 API response time khá tốt',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[3],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Task assignment cho sprint này xong chưa?',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[2],
        readBy: [users[0], users[1], users[2]],
      },
      {
        content: 'Đã assign xong, check Jira nhé',
        type: MessageType.TEXT,
        chat: chats[0],
        sender: users[0],
        readBy: [users[0], users[1], users[2], users[3]],
      },
      {
        content: 'Product catalog có search functionality chưa?',
        type: MessageType.TEXT,
        chat: chats[6],
        sender: users[2],
        readBy: [users[1], users[2], users[3]],
      },
      {
        content: 'Có rồi! Full-text search với Elasticsearch',
        type: MessageType.TEXT,
        chat: chats[6],
        sender: users[1],
        readBy: [users[1], users[2], users[3]],
      },
      {
        content: 'Payment gateway testing credentials ở đâu?',
        type: MessageType.TEXT,
        chat: chats[6],
        sender: users[3],
        readBy: [users[1], users[3]],
      },
      {
        content: 'Check note "E-commerce Payment Integration"',
        type: MessageType.TEXT,
        chat: chats[6],
        sender: users[2],
        readBy: [users[2], users[3]],
      },
      {
        content: 'Meeting lúc 3PM để discuss architecture',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[0],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Roger that 👍',
        type: MessageType.TEXT,
        chat: chats[4],
        sender: users[1],
        readBy: [users[0], users[1], users[3]],
      },
      {
        content: 'Database migration script ready for review',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[1],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Backup plan có sẵn chưa?',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[0],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Yes, đã test rollback procedure',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[1],
        readBy: [users[0], users[1]],
      },
      {
        content: 'Security audit report attached',
        type: MessageType.FILE,
        chat: chats[0],
        sender: users[1],
        readBy: [users[0], users[1]],
      },
      {
        content: 'IoT devices connect thành công 🎉',
        type: MessageType.TEXT,
        chat: chats[2],
        sender: users[2],
        readBy: [users[1], users[2], users[3]],
      },
      {
        content: 'Smart contract deployed to testnet',
        type: MessageType.TEXT,
        chat: chats[5],
        sender: users[3],
        readBy: [users[0], users[3]],
      },
      {
        content: 'Contract address: 0x123...abc',
        type: MessageType.TEXT,
        chat: chats[5],
        sender: users[3],
        readBy: [users[0], users[3]],
      },
    ];

    for (const messageData of messagesData) {
      const message = messageRepository.create(messageData);
      await messageRepository.save(message);
    }
    console.log(`✅ Created ${messagesData.length} messages`);

    // ========== SEED NOTIFICATIONS ==========
    console.log('\n🔔 Seeding Notifications...');

    const notificationsData = [
      {
        title: 'Công việc mới được giao',
        message:
          'Bạn đã được giao công việc "Thiết kế mockup trang chủ"',
        type: NotificationType.TASK_ASSIGNED,
        read: false,
        user: users[3],
        link: '/tasks/1',
      },
      {
        title: 'Deadline sắp tới',
        message: 'Công việc "API Integration" sẽ đến hạn vào 20/12/2024',
        type: NotificationType.TASK_DUE_SOON,
        read: true,
        user: users[3],
        link: '/tasks/3',
      },
      {
        title: 'Được thêm vào dự án',
        message: 'Bạn đã được thêm vào dự án "Website Redesign"',
        type: NotificationType.PROJECT_ADDED,
        read: false,
        user: users[3],
        link: '/projects/1',
      },
      {
        title: 'Task đã hoàn thành',
        message: 'Phạm Thị Member đã hoàn thành "Design app icon và splash screen"',
        type: NotificationType.TASK_COMPLETED,
        read: true,
        user: users[1],
        link: '/tasks/11',
      },
      {
        title: 'Comment mới',
        message: 'Nguyễn Văn Tuyên đã comment trên task của bạn',
        type: NotificationType.COMMENT,
        read: false,
        user: users[3],
        link: '/tasks/1',
      },
      {
        title: 'Được mention trong comment',
        message: 'Bạn được mention trong một comment',
        type: NotificationType.MENTION,
        read: false,
        user: users[2],
        link: '/tasks/2',
      },
      {
        title: 'Dự án sắp deadline',
        message: 'Dự án "Marketing Campaign Q4" sắp đến deadline',
        type: NotificationType.DEADLINE,
        read: true,
        user: users[2],
        link: '/projects/3',
      },
      {
        title: 'Task được cập nhật',
        message: 'Task "Database optimization" đã được cập nhật status',
        type: NotificationType.INFO,
        read: false,
        user: users[1],
        link: '/tasks/3',
      },
      {
        title: 'Tin nhắn mới',
        message: 'Bạn có tin nhắn mới từ Nguyễn Văn Tuyên',
        type: NotificationType.CHAT_MESSAGE,
        read: false,
        user: users[1],
        link: '/chat',
      },
      {
        title: 'File đã được upload',
        message: 'Phạm Thị Member đã upload file "mockup-homepage-v2.fig"',
        type: NotificationType.INFO,
        read: true,
        user: users[0],
        link: '/tasks/1',
      },
      {
        title: 'Task overdue',
        message: 'Task "Setup CI/CD pipeline" đã quá hạn',
        type: NotificationType.TASK_OVERDUE,
        read: false,
        user: users[3],
        link: '/tasks/4',
      },
      {
        title: 'Review request',
        message: 'Task "User authentication flow" cần review',
        type: NotificationType.INFO,
        read: false,
        user: users[0],
        link: '/tasks/6',
      },
      {
        title: 'Được thêm vào team chat',
        message: 'Bạn đã được thêm vào "AI/ML Research" group',
        type: NotificationType.CHAT_MESSAGE,
        read: true,
        user: users[3],
        link: '/chat',
      },
      {
        title: 'Sprint planning meeting',
        message: 'Sprint planning meeting lúc 2PM hôm nay',
        type: NotificationType.WARNING,
        read: false,
        user: users[1],
        link: '/calendar',
      },
      {
        title: 'Task priority changed',
        message: 'Task "Security audit" được đổi thành URGENT',
        type: NotificationType.INFO,
        read: false,
        user: users[1],
        link: '/tasks/8',
      },
      {
        title: 'Dự án hoàn thành',
        message: 'Dự án "Mobile Payment Gateway" đã hoàn thành',
        type: NotificationType.SUCCESS,
        read: true,
        user: users[1],
        link: '/projects/16',
      },
      {
        title: 'New team member',
        message: 'Hoàng Văn Guest đã được thêm vào dự án',
        type: NotificationType.PROJECT_ADDED,
        read: false,
        user: users[0],
        link: '/projects/1',
      },
      {
        title: 'Checklist completed',
        message: 'Tất cả checklist items đã hoàn thành',
        type: NotificationType.SUCCESS,
        read: true,
        user: users[3],
        link: '/tasks/10',
      },
      {
        title: 'Note được share',
        message: 'Nguyễn Văn Tuyên đã share note "Security Best Practices"',
        type: NotificationType.INFO,
        read: false,
        user: users[2],
        link: '/notes',
      },
      {
        title: 'System maintenance',
        message: 'Hệ thống sẽ bảo trì lúc 2AM ngày mai',
        type: NotificationType.SYSTEM,
        read: false,
        user: users[0],
        link: '/settings',
      },
    ];

    for (const notificationData of notificationsData) {
      const notification = notificationRepository.create(notificationData);
      await notificationRepository.save(notification);
    }
    console.log(`✅ Created ${notificationsData.length} notifications`);

    // ========== SEED SYSTEM SETTINGS ==========
    console.log('\n⚙️  Seeding System Settings...');

    const systemSettingsData = [
      {
        key: 'app.name',
        value: 'Task Management System',
        type: 'string',
        description: 'Tên ứng dụng',
      },
      {
        key: 'app.version',
        value: '1.0.0',
        type: 'string',
        description: 'Phiên bản ứng dụng',
      },
      {
        key: 'email.enabled',
        value: 'true',
        type: 'boolean',
        description: 'Bật/tắt gửi email',
      },
      {
        key: 'max.upload.size',
        value: '10485760',
        type: 'number',
        description: 'Kích thước upload tối đa (bytes)',
      },
    ];

    for (const settingData of systemSettingsData) {
      let setting = await systemSettingRepository.findOne({
        where: { key: settingData.key },
      });
      if (!setting) {
        setting = systemSettingRepository.create(settingData);
        await systemSettingRepository.save(setting);
        console.log(`✅ Created setting: ${settingData.key}`);
      }
    }

    // ========== SEED USER SETTINGS ==========
    console.log('\n👤 Seeding User Settings...');
    
    // Get existing themes for linking
    const themes = await themeRepository.find();
    
    const userSettingsData = [
      {
        user: users[0],
        theme: themes.length > 0 ? themes[0] : undefined,
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        emailNotifications: true,
        pushNotifications: true,
        taskReminders: true,
        weeklyReport: true,
        soundEnabled: true,
        compactView: false,
      },
      {
        user: users[1],
        theme: themes.length > 1 ? themes[1] : undefined,
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        emailNotifications: true,
        pushNotifications: true,
        taskReminders: true,
        weeklyReport: true,
        soundEnabled: false,
        compactView: true,
      },
      {
        user: users[2],
        theme: themes.length > 0 ? themes[0] : undefined,
        language: 'en',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        emailNotifications: false,
        pushNotifications: true,
        taskReminders: true,
        weeklyReport: false,
        soundEnabled: true,
        compactView: false,
      },
      {
        user: users[3],
        theme: themes.length > 2 ? themes[2] : undefined,
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        emailNotifications: true,
        pushNotifications: false,
        taskReminders: false,
        weeklyReport: true,
        soundEnabled: true,
        compactView: true,
      },
      {
        user: users[4],
        theme: themes.length > 0 ? themes[0] : undefined,
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        emailNotifications: false,
        pushNotifications: false,
        taskReminders: false,
        weeklyReport: false,
        soundEnabled: false,
        compactView: false,
      },
    ];

    for (const userSettingData of userSettingsData) {
      const userSettings = userSettingsRepository.create(userSettingData);
      await userSettingsRepository.save(userSettings);
    }
    console.log(`✅ Created ${userSettingsData.length} user settings`);

    console.log('\n✅ ========== SEED COMPLETED ==========\n');
    console.log('📊 Summary:');
    console.log(`   - Roles: ${roles.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Tags: ${tags.length}`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Comments: ${commentsData.length}`);
    console.log(`   - Checklist Items: ${checklistCount}`);
    console.log(`   - Attachments: ${attachmentsData.length}`);
    console.log(`   - Activity Logs: ${activityLogsData.length}`);
    console.log(`   - Notes: ${notesData.length}`);
    console.log(`   - Chats: ${chats.length}`);
    console.log(`   - Messages: ${messagesData.length}`);
    console.log(`   - Notifications: ${notificationsData.length}`);
    console.log(`   - System Settings: ${systemSettingsData.length}`);
    console.log(`   - User Settings: ${userSettingsData.length}\n`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
