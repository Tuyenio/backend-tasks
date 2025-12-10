import AppDataSource from '../src/database/data-source';

interface TestResult {
  role: string;
  test: string;
  expected: boolean;
  actual: boolean;
  passed: boolean;
}

async function testPermissionSystem() {
  await AppDataSource.initialize();
  console.log('=== PERMISSION SYSTEM TEST ===\n');

  const results: TestResult[] = [];

  try {
    // Get all users with roles
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

    console.log('👥 Testing with users:\n');
    users.forEach(u => {
      const role = u.roles && u.roles[0] ? u.roles[0] : 'no role';
      console.log(`   ${u.email} (${u.name}): ${role}`);
    });

    console.log('\n📋 PERMISSION TESTS:\n');

    for (const user of users) {
      const roleName = user.roles && user.roles[0] ? user.roles[0] : 'no_role';
      const permissions = user.permissions && user.permissions[0] 
        ? (user.permissions[0] === '*' 
            ? ['*'] 
            : user.permissions[0].split(','))
        : [];

      const isSuperAdmin = roleName === 'super_admin';
      const isAdmin = roleName === 'admin';
      const isManager = roleName === 'manager';
      const isMember = roleName === 'member';
      const isGuest = roleName === 'guest';

      const hasPermission = (perm: string) => {
        if (isSuperAdmin) return true; // Super admin has all
        return permissions.includes(perm);
      };

      // Test cases for each role
      const testCases: Omit<TestResult, 'passed'>[] = [
        // Super Admin should have all permissions
        { role: roleName, test: 'projects.create', expected: isSuperAdmin, actual: hasPermission('projects.create') },
        { role: roleName, test: 'tasks.create', expected: isSuperAdmin || isAdmin || isManager || isMember, actual: hasPermission('tasks.create') },
        { role: roleName, test: 'tasks.delete', expected: isSuperAdmin || isAdmin || isManager, actual: hasPermission('tasks.delete') },
        { role: roleName, test: 'users.manage', expected: isSuperAdmin || isAdmin, actual: hasPermission('users.manage') },
        { role: roleName, test: 'roles.manage', expected: isSuperAdmin || isAdmin, actual: hasPermission('roles.manage') },
        { role: roleName, test: 'reports.view', expected: isSuperAdmin || isAdmin || isManager, actual: hasPermission('reports.view') },
        { role: roleName, test: 'notes.create', expected: !isGuest, actual: hasPermission('notes.create') },
        { role: roleName, test: 'chat.send', expected: !isGuest, actual: hasPermission('chat.send') },
        { role: roleName, test: 'settings.manage', expected: isSuperAdmin || isAdmin, actual: hasPermission('settings.manage') },
      ];

      testCases.forEach(tc => {
        const passed = tc.expected === tc.actual;
        results.push({ ...tc, passed });
      });
    }

    // Print results
    const groupedResults = results.reduce((acc, r) => {
      if (!acc[r.role]) acc[r.role] = [];
      acc[r.role].push(r);
      return acc;
    }, {} as Record<string, TestResult[]>);

    Object.entries(groupedResults).forEach(([role, tests]) => {
      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      const icon = passed === total ? '✅' : '❌';
      
      console.log(`${icon} ${role.toUpperCase()}: ${passed}/${total} tests passed`);
      
      tests.forEach(t => {
        if (!t.passed) {
          console.log(`   ❌ ${t.test}: expected ${t.expected}, got ${t.actual}`);
        }
      });
    });

    // Summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Please check role permissions in database.');
    } else {
      console.log('\n✅ All permission tests passed!');
    }

    // Test actual API endpoints (simulated)
    console.log('\n\n🔒 API ENDPOINT ACCESS TEST:\n');

    const endpoints = [
      { method: 'GET', path: '/api/projects', permission: 'projects.view' },
      { method: 'POST', path: '/api/projects', permission: 'projects.create' },
      { method: 'DELETE', path: '/api/projects/:id', permission: 'projects.delete' },
      { method: 'GET', path: '/api/tasks', permission: 'tasks.view' },
      { method: 'POST', path: '/api/tasks', permission: 'tasks.create' },
      { method: 'DELETE', path: '/api/tasks/:id', permission: 'tasks.delete' },
      { method: 'GET', path: '/api/users', permission: 'users.view' },
      { method: 'PATCH', path: '/api/users/:id', permission: 'users.manage' },
      { method: 'GET', path: '/api/roles', permission: 'roles.view' },
      { method: 'POST', path: '/api/roles', permission: 'roles.create' },
      { method: 'GET', path: '/api/reports', permission: 'reports.view' },
      { method: 'POST', path: '/api/reports/export', permission: 'reports.export' },
    ];

    for (const user of users.slice(0, 3)) { // Test first 3 users
      const roleName = user.roles && user.roles[0] ? user.roles[0] : 'no_role';
      const permissions = user.permissions && user.permissions[0]
        ? (user.permissions[0] === '*'
            ? ['*']
            : user.permissions[0].split(','))
        : [];

      const isSuperAdmin = roleName === 'super_admin';
      const hasAccess = (perm: string) => isSuperAdmin || permissions.includes(perm);

      console.log(`${user.email} (${roleName}):`);
      
      const accessible = endpoints.filter(e => hasAccess(e.permission));
      const blocked = endpoints.filter(e => !hasAccess(e.permission));

      console.log(`   ✅ Accessible: ${accessible.length}/${endpoints.length} endpoints`);
      if (blocked.length > 0 && !isSuperAdmin) {
        console.log(`   ❌ Blocked: ${blocked.length} endpoints`);
        blocked.slice(0, 3).forEach(e => {
          console.log(`      - ${e.method} ${e.path} (requires ${e.permission})`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testPermissionSystem();
