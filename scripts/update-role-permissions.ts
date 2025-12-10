import AppDataSource from '../src/database/data-source';

async function updateRolePermissions() {
  await AppDataSource.initialize();
  console.log('🔄 Updating role permissions...\n');

  try {
    const roleUpdates = [
      {
        name: 'admin',
        permissions: [
          'users.view', 'users.manage', 'users.invite',
          'projects.create', 'projects.update', 'projects.delete', 'projects.view',
          'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.view', 'tasks.assign',
          'notes.create', 'notes.update', 'notes.delete', 'notes.view',
          'chat.create', 'chat.send',
          'reports.view', 'reports.export',
          'roles.view', 'roles.manage',
          'settings.view', 'settings.manage',
          'notifications.view',
          'search.use',
          'upload.create', 'upload.view',
        ],
      },
      {
        name: 'manager',
        permissions: [
          'projects.update', 'projects.view',
          'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.view', 'tasks.assign',
          'notes.create', 'notes.update', 'notes.delete', 'notes.view',
          'chat.create', 'chat.send',
          'reports.view', 'reports.export',
          'notifications.view',
          'search.use',
          'upload.create', 'upload.view',
        ],
      },
      {
        name: 'member',
        permissions: [
          'projects.view',
          'tasks.create', 'tasks.update', 'tasks.view', 'tasks.assign',
          'notes.create', 'notes.update', 'notes.view',
          'chat.create', 'chat.send',
          'notifications.view',
          'search.use',
          'upload.create', 'upload.view',
        ],
      },
      {
        name: 'guest',
        permissions: [
          'projects.view',
          'tasks.view',
          'notes.view',
          'notifications.view',
          'search.use',
        ],
      },
    ];

    for (const roleUpdate of roleUpdates) {
      const permissionsStr = roleUpdate.permissions.join(',');
      await AppDataSource.query(
        `UPDATE roles SET permissions = $1, "updatedAt" = NOW() WHERE name = $2`,
        [permissionsStr, roleUpdate.name]
      );
      console.log(`✅ Updated ${roleUpdate.name}: ${roleUpdate.permissions.length} permissions`);
    }

    console.log('\n✅ All role permissions updated successfully!');
    
    // Verify
    console.log('\n📋 Current permissions:\n');
    const roles = await AppDataSource.query(
      `SELECT name, "displayName", permissions FROM roles ORDER BY name`
    );
    
    roles.forEach((role: any) => {
      const perms = role.permissions === '*' ? ['* (all permissions)'] : role.permissions.split(',');
      console.log(`${role.displayName} (${role.name}):`);
      console.log(`  ${perms.length} permissions`);
      if (perms.length <= 10) {
        perms.forEach((p: string) => console.log(`    - ${p}`));
      } else {
        perms.slice(0, 5).forEach((p: string) => console.log(`    - ${p}`));
        console.log(`    ... and ${perms.length - 5} more`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error updating permissions:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

updateRolePermissions();
