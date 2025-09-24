const fetch = require('node-fetch');

async function checkEmailServiceStatus() {
  console.log('🔍 Checking Email Service Status...\n');

  // Test 1: Check backend email configuration
  console.log('1. Testing backend email configuration...');
  try {
    const response = await fetch('http://localhost:3001/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Backend config test result:', result);
    
    if (result.success) {
      console.log('✅ Backend email configuration is working');
    } else {
      console.log('❌ Backend email configuration failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Failed to test backend configuration:', error.message);
  }

  // Test 2: Check health endpoint
  console.log('\n2. Testing health endpoint...');
  try {
    const response = await fetch('http://localhost:3001/health');
    const result = await response.json();
    console.log('Health check result:', result);
    
    if (response.ok) {
      console.log('✅ Health endpoint is working');
    } else {
      console.log('❌ Health endpoint failed');
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
  }

  // Test 3: Simulate frontend isConfigured check
  console.log('\n3. Simulating frontend isConfigured check...');
  try {
    // This is what the frontend does to set isConfigured
    const testResponse = await fetch('http://localhost:3001/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const testResult = await testResponse.json();
    
    if (testResult.success) {
      console.log('✅ Frontend isConfigured would be: TRUE');
      console.log('   📧 Email notifications should work from UI');
    } else {
      console.log('❌ Frontend isConfigured would be: FALSE');
      console.log('   📧 Email notifications will be skipped from UI');
      console.log('   Error:', testResult.error);
    }
  } catch (error) {
    console.log('❌ Frontend isConfigured check failed:', error.message);
    console.log('   📧 Email notifications will be skipped from UI');
  }

  // Test 4: Test actual digital pass email
  console.log('\n4. Testing actual digital pass email...');
  try {
    const passData = {
      to: 'coreproject007@gmail.com',
      passData: {
        visitorId: 'status-check-001',
        visitorName: 'Status Check User',
        hostName: 'Test Host',
        company: 'Test Company',
        visitDate: '2024-01-25',
        startTime: '09:00',
        endTime: '17:00',
        purpose: 'Email Service Status Check',
        zone: 'Main Building',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        passId: 'STATUS-CHECK-001',
        validUntil: '17:00'
      }
    };

    const response = await fetch('http://localhost:3001/api/email/digital-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passData),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Digital pass email sent successfully');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('❌ Digital pass email failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Digital pass email error:', error.message);
  }

  console.log('\n🎯 Status Summary:');
  console.log('   - If backend tests pass but frontend isConfigured is FALSE, there\'s a timing issue');
  console.log('   - If all tests pass, the issue might be in the UI component logic');
  console.log('   - Check browser console for "Email service not configured" warnings');
}

checkEmailServiceStatus().catch(console.error);