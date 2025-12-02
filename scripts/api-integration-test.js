/**
 * Automated API Integration Tests
 * Run this script to test all backend endpoints
 */

const API_BASE = 'http://localhost:3001';
let authToken = '';
let testUserId = '';
let testProjectId = '';
let testTaskId = '';
let testNoteId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, body = null, shouldSucceed = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    };

    const response = await fetch(`${API_BASE}${url}`, options);
    const data = await response.json();

    if (shouldSucceed && response.ok) {
      log(`✅ PASS: ${name}`, 'green');
      return { success: true, data, status: response.status };
    } else if (!shouldSucceed && !response.ok) {
      log(`✅ PASS: ${name} (Expected failure)`, 'green');
      return { success: true, data, status: response.status };
    } else {
      log(`❌ FAIL: ${name} - Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(data).substring(0, 200)}`, 'red');
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`❌ ERROR: ${name} - ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 Starting TaskMaster API Integration Tests\n', 'blue');

  // ========== AUTH TESTS ==========
  log('\n📝 Testing Auth Module...', 'magenta');

  // Test login
  const loginResult = await testEndpoint(
    'Login with super_admin',
    'POST',
    '/auth/login',
    {
      email: 'tt98tuyen@gmail.com',
      password: '123123123',
    }
  );

  if (loginResult.success && loginResult.data.accessToken) {
    authToken = loginResult.data.accessToken;
    testUserId = loginResult.data.user.id;
    log(`   Token: ${authToken.substring(0, 30)}...`, 'blue');
  } else {
    log('   ⚠️  Login failed, stopping tests', 'red');
    return;
  }

  // Test JWT token contains roles
  await testEndpoint('Test JWT token has roles', 'GET', '/auth/test-jwt');

  // Test get profile
  await testEndpoint('Get user profile', 'GET', '/auth/profile');

  // ========== USERS TESTS ==========
  log('\n👥 Testing Users Module...', 'magenta');

  await testEndpoint('Get all users', 'GET', '/users');
  await testEndpoint('Get user by ID', 'GET', `/users/${testUserId}`);
  await testEndpoint(
    'Update user profile',
    'PATCH',
    `/users/${testUserId}`,
    {
      name: 'Nguyễn Văn Tuyên (Updated)',
      bio: 'Updated bio from API test',
    }
  );

  // Test user settings
  await testEndpoint('Get user settings', 'GET', '/users/settings/me');
  await testEndpoint(
    'Update user settings',
    'PATCH',
    '/users/settings/me',
    {
      emailNotifications: true,
      pushNotifications: true,
      soundEnabled: false,
    }
  );

  // ========== ROLES TESTS ==========
  log('\n🎭 Testing Roles Module...', 'magenta');

  await testEndpoint('Get all roles', 'GET', '/roles');
  const rolesResult = await testEndpoint('Get super_admin role', 'GET', '/roles');
  
  if (rolesResult.success && rolesResult.data.length > 0) {
    const superAdminRole = rolesResult.data.find(r => r.name === 'super_admin');
    if (superAdminRole) {
      log(`   Super Admin permissions: ${superAdminRole.permissions?.length || 0}`, 'blue');
    }
  }

  // ========== ADMIN TESTS ==========
  log('\n⚙️  Testing Admin Module...', 'magenta');

  await testEndpoint('Get system settings', 'GET', '/admin/system-settings');
  await testEndpoint('Get activity logs', 'GET', '/admin/activity-logs');
  await testEndpoint('Get dashboard stats', 'GET', '/admin/dashboard');

  // ========== PROJECTS TESTS ==========
  log('\n📁 Testing Projects Module...', 'magenta');

  await testEndpoint('Get all projects', 'GET', '/projects');
  
  const createProjectResult = await testEndpoint(
    'Create new project',
    'POST',
    '/projects',
    {
      name: 'API Test Project',
      description: 'Created by automated test',
      color: '#3b82f6',
      status: 'active',
    }
  );

  if (createProjectResult.success && createProjectResult.data.id) {
    testProjectId = createProjectResult.data.id;
    log(`   Created project ID: ${testProjectId}`, 'blue');

    await testEndpoint('Get project by ID', 'GET', `/projects/${testProjectId}`);
    await testEndpoint(
      'Update project',
      'PATCH',
      `/projects/${testProjectId}`,
      {
        description: 'Updated by automated test',
        progress: 50,
      }
    );
  }

  // ========== TASKS TESTS ==========
  log('\n✅ Testing Tasks Module...', 'magenta');

  await testEndpoint('Get all tasks', 'GET', '/tasks');

  if (testProjectId) {
    const createTaskResult = await testEndpoint(
      'Create new task',
      'POST',
      '/tasks',
      {
        title: 'API Test Task',
        description: 'Created by automated test',
        projectId: testProjectId,
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
    );

    if (createTaskResult.success && createTaskResult.data.id) {
      testTaskId = createTaskResult.data.id;
      log(`   Created task ID: ${testTaskId}`, 'blue');

      await testEndpoint('Get task by ID', 'GET', `/tasks/${testTaskId}`);
      await testEndpoint(
        'Update task status',
        'PATCH',
        `/tasks/${testTaskId}`,
        {
          status: 'in_progress',
        }
      );
      await testEndpoint(
        'Update task priority',
        'PATCH',
        `/tasks/${testTaskId}`,
        {
          priority: 'urgent',
        }
      );
    }
  }

  // ========== NOTES TESTS ==========
  log('\n📝 Testing Notes Module...', 'magenta');

  await testEndpoint('Get all notes', 'GET', '/notes');

  const createNoteResult = await testEndpoint(
    'Create new note',
    'POST',
    '/notes',
    {
      title: 'API Test Note',
      content: '# Test Note\n\nCreated by automated test',
      tags: 'test,automation',
      isPinned: false,
      projectId: testProjectId,
    }
  );

  if (createNoteResult.success && createNoteResult.data.id) {
    testNoteId = createNoteResult.data.id;
    log(`   Created note ID: ${testNoteId}`, 'blue');

    await testEndpoint('Get note by ID', 'GET', `/notes/${testNoteId}`);
    await testEndpoint(
      'Update note',
      'PATCH',
      `/notes/${testNoteId}`,
      {
        isPinned: true,
        content: '# Updated Note\n\nUpdated by automated test',
      }
    );
  }

  // ========== TAGS TESTS ==========
  log('\n🏷️  Testing Tags Module...', 'magenta');

  await testEndpoint('Get all tags', 'GET', '/tags');
  await testEndpoint('Search tags', 'GET', '/tags/search?q=test');

  // ========== CHAT TESTS ==========
  log('\n💬 Testing Chat Module...', 'magenta');

  await testEndpoint('Get all chats', 'GET', '/chat');

  // ========== NOTIFICATIONS TESTS ==========
  log('\n🔔 Testing Notifications Module...', 'magenta');

  await testEndpoint('Get all notifications', 'GET', '/notifications');
  await testEndpoint('Get unread count', 'GET', '/notifications/unread-count');

  // ========== CLEANUP (Optional) ==========
  log('\n🧹 Cleanup (optional)...', 'yellow');

  if (testNoteId) {
    await testEndpoint('Delete test note', 'DELETE', `/notes/${testNoteId}`);
  }
  if (testTaskId) {
    await testEndpoint('Delete test task', 'DELETE', `/tasks/${testTaskId}`);
  }
  if (testProjectId) {
    await testEndpoint('Delete test project', 'DELETE', `/projects/${testProjectId}`);
  }

  // ========== ERROR HANDLING TESTS ==========
  log('\n⚠️  Testing Error Handling...', 'magenta');

  await testEndpoint(
    'Invalid login credentials',
    'POST',
    '/auth/login',
    {
      email: 'wrong@email.com',
      password: 'wrongpassword',
    },
    false // Should fail
  );

  await testEndpoint(
    'Access non-existent resource',
    'GET',
    '/projects/00000000-0000-0000-0000-000000000000',
    null,
    false // Should fail
  );

  await testEndpoint(
    'Create project without title',
    'POST',
    '/projects',
    {
      description: 'No title',
    },
    false // Should fail
  );

  // ========== SUMMARY ==========
  log('\n📊 Test Summary', 'blue');
  log('All critical endpoints tested!', 'green');
  log('Check results above for any failures.\n', 'yellow');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
