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
          'reports.view',
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
        title: 'Setup Firebase',
        description: 'Cấu hình Firebase cho push notification',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-01-10'),
        estimatedHours: 12,
        project: projects[1],
        createdBy: users[1],
        assignees: [users[3]],
        tags: [tags[2], tags[6]],
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
    ];

    for (const taskData of tasksData) {
      const task = taskRepository.create(taskData);
      await taskRepository.save(task);
      console.log(`✅ Created task: ${taskData.title}`);
    }

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
    ];

    for (const noteData of notesData) {
      const note = noteRepository.create(noteData);
      await noteRepository.save(note);
      console.log(`✅ Created note: ${noteData.title}`);
    }

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
      console.log(
        `✅ Created chat: ${chatData.name || 'Direct Message'}`,
      );
    }

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
        content: 'Hi, có thể review code của em không?',
        type: MessageType.TEXT,
        chat: chats[1],
        sender: users[1],
        readBy: [users[0], users[1]],
      },
    ];

    for (const messageData of messagesData) {
      const message = messageRepository.create(messageData);
      await messageRepository.save(message);
      console.log(`✅ Created message from ${messageData.sender.name}`);
    }

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
    ];

    for (const notificationData of notificationsData) {
      const notification = notificationRepository.create(notificationData);
      await notificationRepository.save(notification);
      console.log(`✅ Created notification: ${notificationData.title}`);
    }

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

    console.log('\n✅ ========== SEED COMPLETED ==========\n');
    console.log('📊 Summary:');
    console.log(`   - Roles: ${roles.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Tags: ${tags.length}`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Tasks: ${tasksData.length}`);
    console.log(`   - Notes: ${notesData.length}`);
    console.log(`   - Chats: ${chats.length}`);
    console.log(`   - Messages: ${messagesData.length}`);
    console.log(`   - Notifications: ${notificationsData.length}`);
    console.log(`   - System Settings: ${systemSettingsData.length}\n`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
