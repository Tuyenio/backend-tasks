/**
 * Update Member Role Permissions
 * Removes 'reports.view' from member role
 */

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { Role } from '../src/entities/role.entity';

async function updateMemberPermissions() {
  console.log('🔄 Updating member role permissions...\n');

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const roleRepository = dataSource.getRepository(Role);

    // Find member role
    const memberRole = await roleRepository.findOne({
      where: { name: 'member' },
    });

    if (!memberRole) {
      console.log('❌ Member role not found!');
      return;
    }

    console.log('📋 Current member permissions:', memberRole.permissions);

    // Remove reports.view permission
    const updatedPermissions = memberRole.permissions.filter(
      (p) => p !== 'reports.view'
    );

    memberRole.permissions = updatedPermissions;
    await roleRepository.save(memberRole);

    console.log('✅ Updated member permissions:', updatedPermissions);
    console.log('\n🎉 Member role updated successfully!');
    console.log('📊 Summary:');
    console.log(`   - Removed: reports.view`);
    console.log(`   - Total permissions: ${updatedPermissions.length}`);

  } catch (error) {
    console.error('❌ Error updating member role:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the update
updateMemberPermissions()
  .then(() => {
    console.log('\n✅ Update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
