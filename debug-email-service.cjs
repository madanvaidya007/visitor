const fetch = require('node-fetch');

async function debugEmailService() {
  console.log('🔍 Debugging Email Service Configuration...\n');

  // Test 1: Check if backend email test endpoint works
  console.log('1. Testing backend email configuration endpoint...');
  try {
    const response = await fetch('http://localhost:3001/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (result.success) {
      console.log('✅ Backend email configuration is working');
    } else {
      console.log('❌ Backend email configuration failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Failed to test backend configuration:', error.message);
  }

  // Test 2: Check all email endpoints
  console.log('\n2. Testing all email endpoints...');
  
  const endpoints = [
    { name: 'Health Check', url: 'http://localhost:3001/health', method: 'GET' },
    { name: 'Email Test', url: 'http://localhost:3001/api/email/test', method: 'POST' },
    { name: 'Test Send', url: 'http://localhost:3001/api/email/test-send', method: 'POST', body: { to: 'coreproject007@gmail.com' } },
    { name: 'Digital Pass', url: 'http://localhost:3001/api/email/digital-pass', method: 'POST', body: { 
      to: 'coreproject007@gmail.com', 
      passData: {
        visitorId: 'debug-001',
        visitorName: 'Debug User',
        hostName: 'Debug Host',
        company: 'Debug Company',
        visitDate: '2024-01-25',
        startTime: '09:00',
        endTime: '17:00',
        purpose: 'Debug Test',
        zone: 'Debug Zone',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        passId: 'DEBUG-001',
        validUntil: '17:00'
      }
    }}
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n   Testing ${endpoint.name}...`);
      
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(endpoint.url, options);
      const result = await response.text();
      
      console.log(`   Status: ${response.status}`);
      
      try {
        const jsonResult = JSON.parse(result);
        console.log(`   Response:`, jsonResult);
        
        if (jsonResult.success) {
          console.log(`   ✅ ${endpoint.name} working`);
        } else {
          console.log(`   ❌ ${endpoint.name} failed:`, jsonResult.error);
        }
      } catch (parseError) {
        console.log(`   Response (text):`, result.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`   ❌ ${endpoint.name} failed:`, error.message);
    }
  }

  // Test 3: Check frontend service initialization simulation
  console.log('\n3. Simulating frontend service initialization...');
  try {
    // This simulates what the frontend does
    console.log('   Initializing email service...');
    
    // Test configuration (what useEmailService does)
    const testResponse = await fetch('http://localhost:3001/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const testResult = await testResponse.json();
    
    if (testResult.success) {
      console.log('   ✅ Frontend service initialization would succeed');
      console.log('   📧 isConfigured would be set to: true');
    } else {
      console.log('   ❌ Frontend service initialization would fail');
      console.log('   📧 isConfigured would be set to: false');
      console.log('   Error:', testResult.error);
    }
  } catch (error) {
    console.log('   ❌ Frontend service initialization simulation failed:', error.message);
  }

  console.log('\n🎯 Debug Summary:');
  console.log('   - If all tests pass, the issue is likely in the frontend UI components');
  console.log('   - If backend tests fail, the issue is in the server configuration');
  console.log('   - If frontend simulation fails, the issue is in the email service hook');
}

debugEmailService().catch(console.error);