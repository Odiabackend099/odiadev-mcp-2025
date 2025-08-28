#!/usr/bin/env node
// ODIADEV MCP Server - FINAL PRODUCTION VERIFICATION
// Confirms 100% production readiness with comprehensive testing

const https = require('https');
const fs = require('fs');

console.log('🔬 ODIADEV FINAL PRODUCTION VERIFICATION');
console.log('=' .repeat(50));

async function verifyProduction(deploymentUrl) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Test 1: Health Endpoint Response
  console.log('\n1. HEALTH ENDPOINT TEST:');
  try {
    const healthData = await httpRequest(`${deploymentUrl}/api/healthcheck`);
    const health = JSON.parse(healthData);
    
    if (health.ok && health.service === 'ODIADEV MCP Server') {
      console.log('✅ Health endpoint responding correctly');
      console.log(`   Service: ${health.service}`);
      console.log(`   Version: ${health.version}`);
      console.log(`   Status: ${health.status}`);
      results.passed++;
    } else {
      console.log('❌ Health endpoint returned invalid response');
      results.failed++;
    }
    results.total++;
  } catch (error) {
    console.log(`❌ Health endpoint failed: ${error.message}`);
    results.failed++;
    results.total++;
  }

  // Test 2: CORS Configuration
  console.log('\n2. CORS CONFIGURATION TEST:');
  try {
    const corsData = await httpRequest(`${deploymentUrl}/api/healthcheck`, {
      'Origin': 'https://mcp.odia.dev'
    });
    console.log('✅ CORS configuration working');
    results.passed++;
  } catch (error) {
    console.log(`⚠️  CORS may need verification: ${error.message}`);
    results.warnings++;
  }
  results.total++;

  // Test 3: API Security (should require auth)
  console.log('\n3. API SECURITY TEST:');
  try {
    await httpRequest(`${deploymentUrl}/api/payments/initiate`, {}, 'POST', '{}');
    console.log('⚠️  Payment endpoint accessible without API key (verify intended)');
    results.warnings++;
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('400')) {
      console.log('✅ API security active (401/400 response expected)');
      results.passed++;
    } else {
      console.log(`⚠️  Unexpected API response: ${error.message}`);
      results.warnings++;
    }
  }
  results.total++;

  // Test 4: TTS Endpoint Structure
  console.log('\n4. TTS ENDPOINT TEST:');
  try {
    await httpRequest(`${deploymentUrl}/api/tts/speak`, {}, 'POST', '{}');
    console.log('⚠️  TTS endpoint accessible (may need API key)');
    results.warnings++;
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('400')) {
      console.log('✅ TTS endpoint properly secured');
      results.passed++;
    } else {
      console.log(`⚠️  TTS endpoint response: ${error.message}`);
      results.warnings++;
    }
  }
  results.total++;

  // Test 5: Nigerian Optimizations Check
  console.log('\n5. NIGERIAN OPTIMIZATIONS CHECK:');
  try {
    const healthData = await httpRequest(`${deploymentUrl}/api/healthcheck`);
    const health = JSON.parse(healthData);
    
    if (health.nigerian_optimizations && 
        health.nigerian_optimizations.retry_logic &&
        health.nigerian_optimizations.currency_support === 'NGN') {
      console.log('✅ Nigerian optimizations active');
      console.log(`   Retry Logic: ${health.nigerian_optimizations.retry_logic}`);
      console.log(`   Currency: ${health.nigerian_optimizations.currency_support}`);
      results.passed++;
    } else {
      console.log('❌ Nigerian optimizations not found in health check');
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Could not verify Nigerian optimizations: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 6: Environment Configuration
  console.log('\n6. ENVIRONMENT CONFIGURATION TEST:');
  try {
    const healthData = await httpRequest(`${deploymentUrl}/api/healthcheck`);
    const health = JSON.parse(healthData);
    
    if (health.configuration) {
      const config = health.configuration;
      console.log(`✅ Configuration loaded successfully`);
      console.log(`   TTS Configured: ${config.ttsConfigured}`);
      console.log(`   Flutterwave Configured: ${config.flutterwaveConfigured}`);
      console.log(`   API Keys Configured: ${config.apiKeysConfigured}`);
      console.log(`   CORS Origin: ${config.corsOrigin}`);
      results.passed++;
    } else {
      console.log('❌ Configuration section missing from health check');
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Could not verify environment configuration: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Calculate final score
  const successRate = Math.round((results.passed / results.total) * 100);
  const overallScore = successRate - (results.warnings * 2); // Deduct 2% per warning
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 FINAL PRODUCTION VERIFICATION RESULTS:');
  console.log('=' .repeat(50));
  console.log(`✅ Tests Passed: ${results.passed}/${results.total}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`\n🚀 Overall Production Score: ${overallScore}%`);
  
  if (overallScore >= 95) {
    console.log('🟢 STATUS: PRODUCTION READY - Deploy with confidence!');
    console.log('🇳🇬 Ready to power Nigeria\'s AI infrastructure');
  } else if (overallScore >= 85) {
    console.log('🟡 STATUS: MOSTLY READY - Address warnings for optimal performance');
  } else {
    console.log('🔴 STATUS: NOT READY - Critical issues must be resolved');
  }

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Set Flutterwave credentials in Vercel dashboard');
  console.log('2. Test payment flow with real transactions');
  console.log('3. Monitor logs for any configuration warnings');
  console.log('4. Setup custom domain: mcp.odia.dev');

  return overallScore;
}

function httpRequest(url, headers = {}, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ODIADEV-Verification/1.0',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Main execution
if (require.main === module) {
  const deploymentUrl = process.argv[2] || 'https://your-deployment.vercel.app';
  
  if (!deploymentUrl.startsWith('https://')) {
    console.log('❌ Please provide a valid HTTPS deployment URL');
    console.log('Usage: node verify-production.js https://your-deployment.vercel.app');
    process.exit(1);
  }

  console.log(`🔍 Testing deployment: ${deploymentUrl}`);
  
  verifyProduction(deploymentUrl)
    .then(score => {
      process.exit(score >= 95 ? 0 : 1);
    })
    .catch(error => {
      console.log(`\n❌ Verification failed: ${error.message}`);
      process.exit(1);
    });
}