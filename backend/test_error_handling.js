// test_error_handling.js
// Simple test script to verify error handling works
import fetch from "node-fetch";

const BASE_URL = "http://localhost:5002";

async function testErrorHandling() {
  console.log("🧪 Testing Error Handling Implementation...\n");

  const tests = [
    {
      name: "Test 404 - Non-existent route",
      url: `${BASE_URL}/api/nonexistent`,
      expectedStatus: 404,
      expectedMessage: "Route /api/nonexistent not found"
    },
    {
      name: "Test 400 - Missing required fields in registration",
      url: `${BASE_URL}/api/users/register`,
      method: "POST",
      body: JSON.stringify({ name: "Test" }), // Missing email and password
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      expectedMessage: "Name, email, and password are required"
    },
    {
      name: "Test 400 - Invalid email format",
      url: `${BASE_URL}/api/users/register`,
      method: "POST",
      body: JSON.stringify({ 
        name: "Test User", 
        email: "invalid-email", 
        password: "password123" 
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      expectedMessage: "Invalid email format"
    },
    {
      name: "Test 400 - Weak password",
      url: `${BASE_URL}/api/users/register`,
      method: "POST",
      body: JSON.stringify({ 
        name: "Test User", 
        email: "test@example.com", 
        password: "123" 
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      expectedMessage: "Password must be at least 6 characters long"
    },
    {
      name: "Test 401 - Unauthorized access to protected route",
      url: `${BASE_URL}/api/users/profile`,
      expectedStatus: 401,
      expectedMessage: "No token provided"
    },
    {
      name: "Test 400 - Missing query parameters",
      url: `${BASE_URL}/api/documents/requirements/list`,
      expectedStatus: 400,
      expectedMessage: "sector and application_type are required"
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`🔍 ${test.name}...`);
      
      const options = {
        method: test.method || "GET",
        headers: test.headers || {}
      };
      
      if (test.body) {
        options.body = test.body;
      }

      const response = await fetch(test.url, options);
      const data = await response.json();

      if (response.status === test.expectedStatus) {
        if (data.error && data.error.message.includes(test.expectedMessage)) {
          console.log(`✅ PASS - Status: ${response.status}, Message: ${data.error.message}`);
          passedTests++;
        } else {
          console.log(`❌ FAIL - Expected message "${test.expectedMessage}" but got "${data.error?.message || data.message}"`);
        }
      } else {
        console.log(`❌ FAIL - Expected status ${test.expectedStatus} but got ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ FAIL - Network error: ${error.message}`);
    }
    console.log("");
  }

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All error handling tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Check the error handling implementation.");
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorHandling().catch(console.error);
}

export { testErrorHandling };
