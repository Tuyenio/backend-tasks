/**
 * REPORTS MODULE INTEGRATION TEST SCRIPT
 * =====================================
 * Comprehensive test for complete FE-BE integration
 * Tests all 3 endpoints with various scenarios
 * 
 * Usage: ts-node scripts/test-reports-integration.ts
 * Or: npx tsx scripts/test-reports-integration.ts
 */

import axios, { AxiosError } from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-jwt-token'; // Replace with real token

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test result tracking
interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  statusCode?: number;
  message: string;
  timestamp: string;
}

const results: TestResult[] = [];

// Helper: Log with colors
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper: Log section header
function logSection(title: string) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
}

// Helper: Log test result
function logTest(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  const color: keyof typeof colors = result.status === 'PASS' ? 'green' : result.status === 'WARN' ? 'yellow' : 'red';
  
  log(
    `${icon} ${result.name} (${result.method} ${result.endpoint})`,
    color
  );
  log(`   └─ ${result.message}`, color);
  if (result.statusCode) {
    log(`   └─ Status: ${result.statusCode}`, color);
  }
}

// Helper: Record test result
function recordTest(result: Omit<TestResult, 'timestamp'>) {
  const fullResult: TestResult = {
    ...result,
    timestamp: new Date().toISOString(),
  };
  results.push(fullResult);
  logTest(fullResult);
}

// Helper: Make API request with error handling
async function makeRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  data?: any,
  headers?: any
) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      data,
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data || error.message,
      };
    }
    return { success: false, status: 0, error: error };
  }
}

// Test 1: GET /reports/statistics (with auth)
async function testGetStatistics() {
  const testName = 'GET /reports/statistics (with valid token)';
  const result = await makeRequest(
    'GET',
    '/reports/statistics',
    undefined,
    { Authorization: `Bearer ${TEST_TOKEN}` }
  );

  if (result.success && result.status === 200) {
    recordTest({
      name: testName,
      endpoint: '/reports/statistics',
      method: 'GET',
      status: 'PASS',
      statusCode: result.status,
      message: `Successfully retrieved statistics. Data: ${JSON.stringify(result.data).substring(0, 100)}...`,
    });
  } else {
    const status = result.status;
    let status_text = 'Unknown';
    if (status === 401) status_text = '401 Unauthorized - Missing or invalid token';
    if (status === 403) status_text = '403 Forbidden - Missing reports.view permission';
    if (status === 500) status_text = '500 Server Error - Backend issue';

    recordTest({
      name: testName,
      endpoint: '/reports/statistics',
      method: 'GET',
      status: status === 403 || status === 401 ? 'WARN' : 'FAIL',
      statusCode: status,
      message: `Request failed: ${status_text}`,
    });
  }
}

// Test 2: GET /reports/statistics (without auth)
async function testGetStatisticsNoAuth() {
  const testName = 'GET /reports/statistics (without token)';
  const result = await makeRequest('GET', '/reports/statistics');

  if (result.status === 401) {
    recordTest({
      name: testName,
      endpoint: '/reports/statistics',
      method: 'GET',
      status: 'PASS',
      statusCode: result.status,
      message: 'Correctly rejected request without token (401 Unauthorized)',
    });
  } else {
    recordTest({
      name: testName,
      endpoint: '/reports/statistics',
      method: 'GET',
      status: 'FAIL',
      statusCode: result.status,
      message: `Expected 401, got ${result.status}. Auth guard may not be working.`,
    });
  }
}

// Test 3: GET /reports/charts with all chart types
async function testGetCharts() {
  const chartTypes = ['task_status', 'task_priority', 'project_status', 'user_activity', 'task_completion_trend'];
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  for (const chartType of chartTypes) {
    const endpoint = `/reports/charts?type=${chartType}&startDate=${startOfYear.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`;
    const testName = `GET /reports/charts (type=${chartType})`;
    
    const result = await makeRequest(
      'GET',
      endpoint,
      undefined,
      { Authorization: `Bearer ${TEST_TOKEN}` }
    );

    if (result.success && result.status === 200) {
      recordTest({
        name: testName,
        endpoint,
        method: 'GET',
        status: 'PASS',
        statusCode: result.status,
        message: `Successfully retrieved ${chartType} chart data`,
      });
    } else {
      recordTest({
        name: testName,
        endpoint,
        method: 'GET',
        status: result.status === 403 ? 'WARN' : 'FAIL',
        statusCode: result.status,
        message: `Failed to retrieve chart data: ${result.status}`,
      });
    }
  }
}

// Test 4: POST /reports/generate with all report types
async function testGenerateReport() {
  const reportTypes = ['tasks', 'projects', 'users', 'activity', 'performance'];
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  for (const reportType of reportTypes) {
    const testName = `POST /reports/generate (type=${reportType})`;
    const payload = {
      type: reportType,
      startDate: startOfYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      format: 'csv',
    };

    const result = await makeRequest(
      'POST',
      '/reports/generate',
      payload,
      { Authorization: `Bearer ${TEST_TOKEN}` }
    );

    if (result.success && result.status === 200) {
      recordTest({
        name: testName,
        endpoint: '/reports/generate',
        method: 'POST',
        status: 'PASS',
        statusCode: result.status,
        message: `Successfully generated ${reportType} report`,
      });
    } else {
      recordTest({
        name: testName,
        endpoint: '/reports/generate',
        method: 'POST',
        status: result.status === 403 ? 'WARN' : 'FAIL',
        statusCode: result.status,
        message: `Failed to generate report: ${result.status} - ${result.error?.message || 'Unknown error'}`,
      });
    }
  }
}

// Test 5: POST /reports/generate without auth
async function testGenerateReportNoAuth() {
  const testName = 'POST /reports/generate (without token)';
  const payload = {
    type: 'tasks',
    format: 'csv',
  };

  const result = await makeRequest('POST', '/reports/generate', payload);

  if (result.status === 401) {
    recordTest({
      name: testName,
      endpoint: '/reports/generate',
      method: 'POST',
      status: 'PASS',
      statusCode: result.status,
      message: 'Correctly rejected request without token (401 Unauthorized)',
    });
  } else {
    recordTest({
      name: testName,
      endpoint: '/reports/generate',
      method: 'POST',
      status: 'FAIL',
      statusCode: result.status,
      message: `Expected 401, got ${result.status}. Auth guard may not be working.`,
    });
  }
}

// Test 6: Date range validation
async function testDateRangeValidation() {
  const testName = 'POST /reports/generate (with invalid date range)';
  const payload = {
    type: 'tasks',
    startDate: '2025-12-31',
    endDate: '2025-01-01', // Invalid: end before start
    format: 'csv',
  };

  const result = await makeRequest(
    'POST',
    '/reports/generate',
    payload,
    { Authorization: `Bearer ${TEST_TOKEN}` }
  );

  if (result.status === 400 || result.status === 400) {
    recordTest({
      name: testName,
      endpoint: '/reports/generate',
      method: 'POST',
      status: 'PASS',
      statusCode: result.status,
      message: 'Correctly rejected invalid date range (400 Bad Request)',
    });
  } else if (result.status === 403) {
    recordTest({
      name: testName,
      endpoint: '/reports/generate',
      method: 'POST',
      status: 'WARN',
      statusCode: result.status,
      message: 'Request blocked by permission guard (403 Forbidden)',
    });
  } else {
    recordTest({
      name: testName,
      endpoint: '/reports/generate',
      method: 'POST',
      status: 'FAIL',
      statusCode: result.status,
      message: `Expected validation error, got ${result.status}`,
    });
  }
}

// Main test runner
async function runAllTests() {
  logSection('REPORTS MODULE INTEGRATION TEST SUITE');
  
  log(`API URL: ${API_URL}\n`, 'blue');
  log(`⚠️  Using test token: ${TEST_TOKEN.substring(0, 20)}...\n`, 'yellow');
  log('ℹ️  Replace TEST_TOKEN with a real JWT token for accurate results\n', 'yellow');

  try {
    // Run all tests
    logSection('Test 1: Authentication & Authorization');
    await testGetStatisticsNoAuth();

    logSection('Test 2: GET /reports/statistics');
    await testGetStatistics();

    logSection('Test 3: GET /reports/charts');
    await testGetCharts();

    logSection('Test 4: POST /reports/generate');
    await testGenerateReport();

    logSection('Test 5: Error Handling');
    await testGenerateReportNoAuth();
    await testDateRangeValidation();

    // Print summary
    logSection('TEST SUMMARY');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    log(`Total Tests: ${total}`, 'blue');
    log(`✅ Passed: ${passed}`, 'green');
    log(`⚠️  Warned: ${warned}`, 'yellow');
    log(`❌ Failed: ${failed}`, 'red');

    // Print detailed results
    if (failed > 0) {
      logSection('FAILED TESTS');
      results
        .filter(r => r.status === 'FAIL')
        .forEach(logTest);
    }

    if (warned > 0) {
      logSection('WARNINGS');
      results
        .filter(r => r.status === 'WARN')
        .forEach(logTest);
    }

    // Export results
    logSection('TEST RESULTS (JSON)');
    log(JSON.stringify(results, null, 2), 'cyan');

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ Test suite failed: ${error}`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests();
