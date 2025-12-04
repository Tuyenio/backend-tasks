/**
 * Get JWT Token Script
 * Logs in a test user and returns the JWT token for API testing
 * 
 * Usage: ts-node -r tsconfig-paths/register scripts/get-jwt-token.ts
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Default test user credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'admin123';

async function getJwtToken() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              JWT Token Retrieval Script                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📍 API Base URL: ${API_BASE_URL}`);
    console.log(`👤 Test User: ${TEST_USER_EMAIL}\n`);

    console.log('🔐 Attempting to login...');

    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      },
      {
        validateStatus: () => true,
      },
    );

    if (response.status === 200 && response.data.access_token) {
      const token = response.data.access_token;
      console.log('\n✅ Login successful!\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                     JWT TOKEN                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(token);
      console.log('\n\n📋 How to use this token:\n');
      console.log('1. Set as environment variable:');
      console.log(`   export TEST_TOKEN="${token}"\n`);
      console.log('2. Or use in Authorization header:');
      console.log(`   Authorization: Bearer ${token}\n`);
      console.log('3. For running upload tests:');
      console.log(`   TEST_TOKEN="${token}" ts-node -r tsconfig-paths/register scripts/test-upload-api.ts\n`);

      // Also save to a file for easy access
      const fs = require('fs');
      const tokenFile = `${__dirname}/.test-token`;
      fs.writeFileSync(tokenFile, token, 'utf-8');
      console.log(`✅ Token saved to: ${tokenFile}`);

      return token;
    } else {
      console.error('❌ Login failed!');
      console.error(`Status: ${response.status}`);
      console.error(`Message: ${response.data.message || response.data.error}`);
      console.error('\n⚠️  Make sure:');
      console.error(
        '   - Backend server is running (pnpm start:dev in backend-tasks folder)',
      );
      console.error(`   - Test user exists: ${TEST_USER_EMAIL}`);
      console.error(
        `   - Or set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars\n`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n⚠️  Make sure backend is running on http://localhost:3001\n');
    process.exit(1);
  }
}

getJwtToken();
