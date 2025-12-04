import axios, { AxiosError } from 'axios';

// Configuration
const API_BASE = 'http://localhost:3001/api';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

if (!TEST_TOKEN) {
  console.error('❌ TEST_TOKEN environment variable not set');
  process.exit(1);
}

interface TestResult {
  name: string;
  method: string;
  endpoint: string;
  status: number;
  time: number;
  success: boolean;
  error?: string;
  responseData?: any;
}

const results: TestResult[] = [];

// Create axios instance with token
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  },
  validateStatus: () => true, // Don't throw on any status
});

/**
 * Test helper function
 */
async function testEndpoint(
  name: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
): Promise<void> {
  try {
    const startTime = Date.now();
    let response;

    switch (method) {
      case 'GET':
        response = await api.get(endpoint);
        break;
      case 'POST':
        response = await api.post(endpoint, data);
        break;
      case 'PUT':
        response = await api.put(endpoint, data);
        break;
      case 'DELETE':
        response = await api.delete(endpoint);
        break;
    }

    const time = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    results.push({
      name,
      method,
      endpoint,
      status: response.status,
      time,
      success,
      responseData: response.data,
    });

    // Log result
    const icon = success ? '✅' : '❌';
    console.log(`\n${icon} ${name}`);
    console.log(`   ${method} ${endpoint}`);
    console.log(`   Status: ${response.status} | Time: ${time}ms`);

    if (success && response.data) {
      if (response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
      if (response.data.data) {
        const dataStr = JSON.stringify(response.data.data).substring(0, 100);
        console.log(`   Data: ${dataStr}...`);
      }
      if (Array.isArray(response.data)) {
        console.log(`   Items: ${response.data.length}`);
      }
    } else if (!success) {
      console.log(`   Error: ${response.data?.message || response.statusText}`);
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    results.push({
      name,
      method,
      endpoint,
      status: axiosError.response?.status || 0,
      time: 0,
      success: false,
      error: axiosError.message,
    });

    console.log(`\n❌ ${name}`);
    console.log(`   ${method} ${endpoint}`);
    console.log(`   Error: ${axiosError.message}`);
  }
}

/**
 * Print summary
 */
function printSummary(): void {
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalTime = results.reduce((sum, r) => sum + r.time, 0);

  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║       Test Results Summary              ║');
  console.log('╚════════════════════════════════════════╝\n');

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(
      `${icon} ${index + 1}. ${result.name.padEnd(30)} | ${result.method.padEnd(6)} | Status: ${result.status}`,
    );
  });

  console.log(`\n📊 SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${results.length}`);
  console.log(`⏱️  Total Time: ${totalTime}ms\n`);

  if (failed === 0) {
    console.log('✅ All tests passed!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed\n`);
    process.exit(1);
  }
}

/**
 * Main test execution
 */
async function runTests(): Promise<void> {
  console.log('🧪 Testing Reports API Endpoints\n');
  console.log(`📍 Base URL: ${API_BASE}`);
  console.log(`🔑 Token: ${TEST_TOKEN.substring(0, 20)}...\n`);

  // Test 1: GET /reports/statistics
  await testEndpoint(
    'Get Overall Statistics',
    'GET',
    '/reports/statistics',
  );

  // Test 2: GET /reports/charts - Task Status
  await testEndpoint(
    'Get Chart Data (Task Status)',
    'GET',
    '/reports/charts?type=task_status&startDate=2025-01-01&endDate=2025-12-31',
  );

  // Test 3: GET /reports/charts - Task Priority
  await testEndpoint(
    'Get Chart Data (Task Priority)',
    'GET',
    '/reports/charts?type=task_priority&startDate=2025-01-01&endDate=2025-12-31',
  );

  // Test 4: GET /reports/charts - Project Status
  await testEndpoint(
    'Get Chart Data (Project Status)',
    'GET',
    '/reports/charts?type=project_status&startDate=2025-01-01&endDate=2025-12-31',
  );

  // Test 5: GET /reports/charts - User Activity
  await testEndpoint(
    'Get Chart Data (User Activity)',
    'GET',
    '/reports/charts?type=user_activity&startDate=2025-01-01&endDate=2025-12-31',
  );

  // Test 6: GET /reports/charts - Task Completion Trend
  await testEndpoint(
    'Get Chart Data (Task Completion Trend)',
    'GET',
    '/reports/charts?type=task_completion_trend&startDate=2025-01-01&endDate=2025-12-31',
  );

  // Test 7: POST /reports/generate - Tasks Report (CSV)
  await testEndpoint(
    'Generate Tasks Report (CSV)',
    'POST',
    '/reports/generate',
    {
      type: 'tasks',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      format: 'csv',
    },
  );

  // Test 8: POST /reports/generate - Projects Report (CSV)
  await testEndpoint(
    'Generate Projects Report (CSV)',
    'POST',
    '/reports/generate',
    {
      type: 'projects',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      format: 'csv',
    },
  );

  // Test 9: POST /reports/generate - Users Report (CSV)
  await testEndpoint(
    'Generate Users Report (CSV)',
    'POST',
    '/reports/generate',
    {
      type: 'users',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      format: 'csv',
    },
  );

  // Test 10: POST /reports/generate - Activity Report (CSV)
  await testEndpoint(
    'Generate Activity Report (CSV)',
    'POST',
    '/reports/generate',
    {
      type: 'activity',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      format: 'csv',
    },
  );

  // Test 11: POST /reports/generate - Performance Report (CSV)
  await testEndpoint(
    'Generate Performance Report (CSV)',
    'POST',
    '/reports/generate',
    {
      type: 'performance',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      format: 'csv',
    },
  );

  // Test 12: POST /reports/generate with Project Filter
  await testEndpoint(
    'Generate Tasks Report with Project Filter',
    'POST',
    '/reports/generate',
    {
      type: 'tasks',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      projectId: 'test-project-id',
      format: 'csv',
    },
  );

  // Print summary
  printSummary();
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
