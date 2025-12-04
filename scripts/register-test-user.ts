/**
 * Register Test User Script
 * Creates a test user for API testing
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function registerTestUser() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           Register Test User Script                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const testUser = {
      email: `test-upload-${Date.now()}@example.com`,
      password: 'TestPass123!',
      name: 'Test Upload User',
    };

    console.log(`📝 Registering test user: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}\n`);

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser, {
      validateStatus: () => true,
    });

    if (registerResponse.status !== 201) {
      console.error(`❌ Registration failed with status ${registerResponse.status}`);
      console.error(registerResponse.data);

      // If user already exists, try logging in with a known user
      if (registerResponse.status === 400 && registerResponse.data.message?.includes('exists')) {
        console.log('\n⚠️  User already exists. Trying to login with existing user...\n');

        // Try with the test user we just tried to register
        const loginResponse = await axios.post(
          `${API_BASE_URL}/auth/login`,
          {
            email: testUser.email,
            password: testUser.password,
          },
          { validateStatus: () => true },
        );

        if (loginResponse.status === 200) {
          console.log('✅ Login successful!\n');
          return {
            email: testUser.email,
            password: testUser.password,
            token: loginResponse.data.access_token,
          };
        }
      }

      return null;
    }

    console.log('✅ Registration successful!\n');

    // Now login to get the token
    console.log('🔐 Logging in to get JWT token...\n');

    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: testUser.email,
        password: testUser.password,
      },
      { validateStatus: () => true },
    );

    if (loginResponse.status === 200 && (loginResponse.data.access_token || loginResponse.data.accessToken)) {
      const token = loginResponse.data.access_token || loginResponse.data.accessToken;

      console.log('✅ Login successful!\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                  TEST USER CREDENTIALS                    ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(`Email: ${testUser.email}`);
      console.log(`Password: ${testUser.password}`);
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log('║                     JWT TOKEN                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(token);
      console.log('\n\n📋 How to use this token:\n');
      console.log('1. Set as environment variable:');
      console.log(`   $env:TEST_TOKEN = "${token}"\n`);
      console.log('2. Or use in Authorization header:');
      console.log(`   Authorization: Bearer ${token}\n`);
      console.log('3. For running upload tests:');
      console.log(`   $env:TEST_TOKEN = "${token}"; pnpm exec ts-node -r tsconfig-paths/register scripts/test-upload-api.ts\n`);

      // Save to file
      const fs = require('fs');
      const tokenFile = `${__dirname}/.test-token`;
      fs.writeFileSync(tokenFile, token, 'utf-8');
      console.log(`✅ Token saved to: ${tokenFile}`);

      return {
        email: testUser.email,
        password: testUser.password,
        token,
      };
    } else {
      console.error('❌ Login failed after registration');
      console.error(loginResponse.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error instanceof Error ? error.message : String(error));
    return null;
  }
}

registerTestUser();
