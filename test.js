const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  // Test 1: Health Check
  try {
    console.log('1️⃣ Testing Health Check endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check passed:', health.data);
  } catch (error) {
    console.error('❌ Health Check failed:', error.message);
  }

  // Test 2: Rate Limiting
  try {
    console.log('\n2️⃣ Testing Rate Limiting...');
    const promises = Array(5).fill().map(() => axios.get(`${BASE_URL}/health`));
    await Promise.all(promises);
    console.log('✅ Rate limiting allows normal usage');
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
  }

  // Test 3: Text-to-Image
  try {
    console.log('\n3️⃣ Testing Text-to-Image generation...');
    const t2iResponse = await axios.post(`${BASE_URL}/generate`, {
      prompt: 'A beautiful sunset over mountains',
      negative: 'blur, noise'
    });
    console.log('✅ Text-to-Image generation successful');
  } catch (error) {
    console.error('❌ Text-to-Image generation failed:', error.response?.data || error.message);
  }

  // Test 4: Missing Required Fields
  try {
    console.log('\n4️⃣ Testing validation middleware...');
    await axios.post(`${BASE_URL}/generate`, {});
    console.log('❌ Validation should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Validation middleware working correctly');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n🏁 Testing complete!');
}

// Install axios if not present
if (!fs.existsSync(path.join(__dirname, 'node_modules', 'axios'))) {
  console.log('Installing axios for testing...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
}

runTests();