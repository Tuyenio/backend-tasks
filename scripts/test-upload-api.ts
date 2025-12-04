/**
 * Upload API Test Script
 * Tests all 7 upload endpoints with various scenarios
 * 
 * Usage: ts-node -r tsconfig-paths/register scripts/test-upload-api.ts
 */

import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const API_BASE_URL = 'http://localhost:3001/api';

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  message: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Test token (use a valid JWT from your auth system)
const TEST_TOKEN = process.env.TEST_TOKEN || '';

async function makeRequest(
  method: string,
  endpoint: string,
  data?: any,
  headers?: any,
  expectStatus?: number,
) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        ...headers,
      },
      validateStatus: () => true, // Don't throw on any status
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    throw error;
  }
}

async function testAvatarUpload() {
  console.log('\n🧪 Testing: POST /upload/avatar');
  const startTime = Date.now();

  try {
    // Create a dummy image file for testing
    const imagePath = path.join(process.cwd(), 'test-image.jpg');
    // Create a minimal JPG file (1x1 pixel)
    const minimalJpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
      0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
      0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
      0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
      0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
      0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
      0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
      0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
      0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
      0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd0, 0xff, 0xd9,
    ]);

    fs.writeFileSync(imagePath, minimalJpg);

    const formData = new FormData();
    const blob = new Blob([minimalJpg], { type: 'image/jpeg' });
    formData.append('file', blob, 'test-avatar.jpg');

    const response = await axios.post(`${API_BASE_URL}/upload/avatar`, formData, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: () => true,
    });

    const passed = response.status === 201;
    testResults.push({
      name: 'Avatar Upload',
      endpoint: 'POST /upload/avatar',
      method: 'POST',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: passed
        ? `Avatar uploaded successfully. URL: ${response.data.url}`
        : `Failed with status ${response.status}: ${response.data.message}`,
      duration: Date.now() - startTime,
    });

    // Cleanup
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  } catch (error) {
    testResults.push({
      name: 'Avatar Upload',
      endpoint: 'POST /upload/avatar',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testSingleFileUpload() {
  console.log('\n🧪 Testing: POST /upload/file');
  const startTime = Date.now();

  try {
    const filePath = path.join(process.cwd(), 'test-file.txt');
    fs.writeFileSync(filePath, 'Test file content for upload');

    const formData = new FormData();
    const blob = new Blob(['Test file content for upload'], { type: 'text/plain' });
    formData.append('file', blob, 'test-file.txt');
    formData.append('entityType', 'task');
    formData.append('entityId', 'test-task-id');

    const response = await axios.post(`${API_BASE_URL}/upload/file`, formData, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: () => true,
    });

    const passed = response.status === 201;
    testResults.push({
      name: 'Single File Upload',
      endpoint: 'POST /upload/file',
      method: 'POST',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: passed
        ? `File uploaded successfully. URL: ${response.data.url}`
        : `Failed with status ${response.status}: ${response.data.message}`,
      duration: Date.now() - startTime,
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    testResults.push({
      name: 'Single File Upload',
      endpoint: 'POST /upload/file',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testMultipleFilesUpload() {
  console.log('\n🧪 Testing: POST /upload/files');
  const startTime = Date.now();

  try {
    const formData = new FormData();
    for (let i = 0; i < 2; i++) {
      const blob = new Blob([`Test file ${i + 1} content`], { type: 'text/plain' });
      formData.append('files', blob, `test-file-${i + 1}.txt`);
    }
    formData.append('entityType', 'project');
    formData.append('entityId', 'test-project-id');

    const response = await axios.post(`${API_BASE_URL}/upload/files`, formData, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: () => true,
    });

    const passed = response.status === 201;
    testResults.push({
      name: 'Multiple Files Upload',
      endpoint: 'POST /upload/files',
      method: 'POST',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: passed
        ? `${response.data.files?.length || 0} files uploaded successfully`
        : `Failed with status ${response.status}: ${response.data.message}`,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    testResults.push({
      name: 'Multiple Files Upload',
      endpoint: 'POST /upload/files',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testGetUserFiles() {
  console.log('\n🧪 Testing: GET /upload/files');
  const startTime = Date.now();

  try {
    const response = await makeRequest('GET', '/upload/files?limit=10');
    const passed = response.status === 200;

    testResults.push({
      name: 'Get User Files',
      endpoint: 'GET /upload/files',
      method: 'GET',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: passed
        ? `Retrieved ${Array.isArray(response.data) ? response.data.length : 0} files`
        : `Failed with status ${response.status}`,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    testResults.push({
      name: 'Get User Files',
      endpoint: 'GET /upload/files',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testGetFileById() {
  console.log('\n🧪 Testing: GET /upload/files/:id');
  const startTime = Date.now();

  try {
    // First get a file ID from user files
    const listResponse = await makeRequest('GET', '/upload/files?limit=1');
    const files = listResponse.data;

    if (Array.isArray(files) && files.length > 0) {
      const fileId = files[0].id;
      const response = await makeRequest('GET', `/upload/files/${fileId}`);
      const passed = response.status === 200;

      testResults.push({
        name: 'Get File By ID',
        endpoint: 'GET /upload/files/:id',
        method: 'GET',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: response.status,
        message: passed
          ? `Retrieved file: ${response.data.name}`
          : `Failed with status ${response.status}`,
        duration: Date.now() - startTime,
      });
    } else {
      testResults.push({
        name: 'Get File By ID',
        endpoint: 'GET /upload/files/:id',
        method: 'GET',
        status: 'FAIL',
        statusCode: 404,
        message: 'No files found to test with',
        duration: Date.now() - startTime,
      });
    }
  } catch (error) {
    testResults.push({
      name: 'Get File By ID',
      endpoint: 'GET /upload/files/:id',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testDeleteFile() {
  console.log('\n🧪 Testing: DELETE /upload/files/:id');
  const startTime = Date.now();

  try {
    // First get a file ID
    const listResponse = await makeRequest('GET', '/upload/files?limit=1');
    const files = listResponse.data;

    if (Array.isArray(files) && files.length > 0) {
      const fileId = files[0].id;
      const response = await makeRequest('DELETE', `/upload/files/${fileId}`);
      const passed = response.status === 200 || response.status === 204;

      testResults.push({
        name: 'Delete File',
        endpoint: 'DELETE /upload/files/:id',
        method: 'DELETE',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: response.status,
        message: passed ? `File deleted successfully` : `Failed with status ${response.status}`,
        duration: Date.now() - startTime,
      });
    } else {
      testResults.push({
        name: 'Delete File',
        endpoint: 'DELETE /upload/files/:id',
        method: 'DELETE',
        status: 'FAIL',
        statusCode: 404,
        message: 'No files found to delete',
        duration: Date.now() - startTime,
      });
    }
  } catch (error) {
    testResults.push({
      name: 'Delete File',
      endpoint: 'DELETE /upload/files/:id',
      method: 'DELETE',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function testGetStorageStats() {
  console.log('\n🧪 Testing: GET /upload/storage/stats');
  const startTime = Date.now();

  try {
    const response = await makeRequest('GET', '/upload/storage/stats');
    const passed = response.status === 200;

    testResults.push({
      name: 'Get Storage Stats',
      endpoint: 'GET /upload/storage/stats',
      method: 'GET',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: passed
        ? `Total used: ${response.data.totalSize || 0} bytes, Files: ${response.data.fileCount || 0}`
        : `Failed with status ${response.status}`,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    testResults.push({
      name: 'Get Storage Stats',
      endpoint: 'GET /upload/storage/stats',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Upload Module API Test Suite - All 7 Endpoints        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🔐 Auth Token: ${TEST_TOKEN ? 'SET' : 'NOT SET - Some tests may fail'}`);

  await testAvatarUpload();
  await testSingleFileUpload();
  await testMultipleFilesUpload();
  await testGetUserFiles();
  await testGetFileById();
  await testDeleteFile();
  await testGetStorageStats();

  // Print results summary
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Results Summary                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passCount = testResults.filter((r) => r.status === 'PASS').length;
  const failCount = testResults.filter((r) => r.status === 'FAIL').length;

  testResults.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name}`);
    console.log(`   Endpoint: ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.statusCode || 'N/A'}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log();
  });

  console.log(`📊 Results: ${passCount} PASSED, ${failCount} FAILED out of ${testResults.length} tests`);
  console.log(
    `\n${passCount === testResults.length ? '✅ All tests passed!' : '⚠️  Some tests failed. Check the results above.'}`,
  );
}

// Check if token is provided
if (!TEST_TOKEN) {
  console.warn('⚠️  Warning: TEST_TOKEN environment variable not set.');
  console.warn('   Many tests will fail due to missing authentication.');
  console.warn('   Set it with: export TEST_TOKEN=your_jwt_token\n');
}

runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
