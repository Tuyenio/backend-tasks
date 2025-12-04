/**
 * Seed Script for Reports Module Testing
 * Populates database with realistic test data for reports statistics
 */

import dataSource from '../src/database/data-source';
import { Task, TaskStatus, TaskPriority } from '../src/entities/task.entity';
import { Project, ProjectStatus } from '../src/entities/project.entity';
import { User } from '../src/entities/user.entity';
import { ActivityLog, ActivityAction, ActivityEntityType } from '../src/entities/activity-log.entity';

async function seedReportsData() {
  try {
    console.log('🌱 Starting database seed for reports...\n');

    // Initialize database
    await dataSource.initialize();
    console.log('🔗 Database connected');

    const tasksRepository = dataSource.getRepository(Task);
    const projectsRepository = dataSource.getRepository(Project);
    const usersRepository = dataSource.getRepository(User);
    const activityRepository = dataSource.getRepository(ActivityLog);

    // Create Users if they don't exist
    console.log('\n👥 Creating users...');
    const existingUsers = await usersRepository.find();
    
    let adminUser: User;
    let user1: User;
    let user2: User;

    if (existingUsers.length === 0) {
      // Create new users for seeding
      const newUsers = await usersRepository.save([
        {
          email: 'admin@taskmaster.local',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          password: 'hashed_password',
          name: 'Admin User',
        } as any,
        {
          email: 'user1@taskmaster.local',
          username: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          password: 'hashed_password',
          name: 'John Doe',
        } as any,
        {
          email: 'user2@taskmaster.local',
          username: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          password: 'hashed_password',
          name: 'Jane Smith',
        } as any,
      ]);
      adminUser = newUsers[0];
      user1 = newUsers[1];
      user2 = newUsers[2];
      console.log(`✓ Created 3 users`);
    } else {
      adminUser = existingUsers[0];
      user1 = existingUsers[1] || existingUsers[0];
      user2 = existingUsers[2] || existingUsers[0];
      console.log(`✓ Using existing users`);
    }

    // Create Projects
    console.log('\n📁 Creating projects...');
    const projects = await projectsRepository.save([
      {
        name: 'Website Redesign',
        description: 'Complete redesign of company website',
        status: ProjectStatus.ACTIVE,
        createdBy: adminUser,
      },
      {
        name: 'Mobile App Development',
        description: 'Build iOS and Android app',
        status: ProjectStatus.ACTIVE,
        createdBy: adminUser,
      },
      {
        name: 'Database Migration',
        description: 'Migrate from MySQL to PostgreSQL',
        status: ProjectStatus.ACTIVE,
        createdBy: adminUser,
      },
    ]);
    console.log(`✓ Created ${projects.length} projects`);

    // Create Tasks with varied statuses and priorities
    console.log('\n✅ Creating tasks...');
    const tasksList: any[] = [];

    // Status distribution: DONE (3), IN_PROGRESS (4), TODO (3)
    const statuses = [
      TaskStatus.DONE,
      TaskStatus.DONE,
      TaskStatus.DONE,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_PROGRESS,
      TaskStatus.TODO,
      TaskStatus.TODO,
      TaskStatus.TODO,
    ];

    // Priority distribution: HIGH (5), MEDIUM (3), LOW (2)
    const priorities = [
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.MEDIUM,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
      TaskPriority.LOW,
    ];

    // Task titles
    const titles = [
      'Design Homepage Mockup',
      'Setup Backend API',
      'Deploy to Production',
      'Implement Authentication',
      'Setup CI/CD Pipeline',
      'Database Optimization',
      'Write Documentation',
      'Code Review Round 1',
      'Performance Testing',
      'Security Audit',
    ];

    for (let i = 0; i < 10; i++) {
      tasksList.push({
        title: titles[i],
        description: `Task ${i + 1}: ${titles[i]}`,
        status: statuses[i],
        priority: priorities[i],
        project: projects[i % 3],
        createdBy: adminUser,
        assignees: [user1, user2],
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    const createdTasks = await tasksRepository.save(tasksList);
    console.log(`✓ Created ${createdTasks.length} tasks`);

    // Create Activity Logs
    console.log('\n📋 Creating activity logs...');
    const activities: any[] = [];

    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const actions = [ActivityAction.CREATE, ActivityAction.UPDATE, ActivityAction.COMMENT];
      const action = actions[Math.floor(Math.random() * actions.length)];

      activities.push({
        action,
        entityType: ActivityEntityType.TASK,
        entityId: createdTasks[Math.floor(Math.random() * createdTasks.length)].id,
        user: i % 2 === 0 ? user1 : user2,
        userId: (i % 2 === 0 ? user1 : user2).id,
        project: projects[Math.floor(Math.random() * projects.length)],
        metadata: { description: `Activity ${i + 1}` },
      });
    }

    await activityRepository.save(activities);
    console.log(`✓ Created ${activities.length} activity logs`);

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: 3`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Tasks: ${createdTasks.length}`);
    console.log(`   - Activities: ${activities.length}`);
    console.log('\n💡 Tip: Refresh your browser to see real data in the reports!\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    try {
      await dataSource.destroy();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

seedReportsData();
