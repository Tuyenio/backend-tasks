import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'tasks_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'tasks',
  entities: [User, Role],
  synchronize: false,
});

async function checkUserRoles() {
  try {
    await AppDataSource.initialize();
    console.log('🔗 Database connected\n');

    const userRepository = AppDataSource.getRepository(User);
    
    // Check user with roles
    const user = await userRepository.findOne({
      where: { email: 'tt98tuyen@gmail.com' },
      relations: ['roles'],
    });

    if (!user) {
      console.log('❌ User not found: tt98tuyen@gmail.com');
      return;
    }

    console.log('👤 User:', user.email);
    console.log('📧 Name:', user.name);
    console.log('🔓 isActive:', user.isActive);
    console.log('🔒 isLocked:', user.isLocked);
    console.log('\n🎭 Roles:');
    
    if (!user.roles || user.roles.length === 0) {
      console.log('  ❌ No roles assigned!');
    } else {
      user.roles.forEach((role, index) => {
        console.log(`\n  Role ${index + 1}:`);
        console.log(`    Name: ${role.name}`);
        console.log(`    Display Name: ${role.displayName}`);
        console.log(`    Is System: ${role.isSystem}`);
        console.log(`    Permissions (${role.permissions?.length || 0}):`);
        if (role.permissions && role.permissions.length > 0) {
          role.permissions.forEach(perm => {
            console.log(`      - ${perm}`);
          });
        } else {
          console.log('      ❌ No permissions!');
        }
      });
    }

    // Check if super_admin role exists
    const roleRepository = AppDataSource.getRepository(Role);
    const superAdminRole = await roleRepository.findOne({
      where: { name: 'super_admin' },
    });

    console.log('\n\n🎭 Super Admin Role Check:');
    if (!superAdminRole) {
      console.log('  ❌ super_admin role does not exist in database!');
    } else {
      console.log('  ✅ super_admin role exists');
      console.log('  Name:', superAdminRole.name);
      console.log('  Display Name:', superAdminRole.displayName);
      console.log(`  Permissions (${superAdminRole.permissions?.length || 0}):`);
      if (superAdminRole.permissions && superAdminRole.permissions.length > 0) {
        superAdminRole.permissions.forEach(perm => {
          console.log(`    - ${perm}`);
        });
      } else {
        console.log('    ❌ No permissions!');
      }
    }

    await AppDataSource.destroy();
    console.log('\n✅ Check completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserRoles();
