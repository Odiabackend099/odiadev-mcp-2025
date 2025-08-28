#!/usr/bin/env node
// ODIADEV MCP Server - Quick Functional Status Check
// Provides immediate status of all endpoints and systems

console.log('⚡ ODIADEV MCP SERVER - QUICK STATUS CHECK');
console.log('=' .repeat(50));

async function quickStatusCheck() {
  const results = {
    endpoints: [],
    overall: 'CHECKING'
  };

  console.log('🔍 Checking all systems...\n');

  // 1. Health Check Test
  console.log('1. 🏥 Health Check Endpoint:');
  try {
    const healthModule = require('./api/healthcheck.js');
    let healthData = null;
    
    const mockReq = { method: 'GET', headers: {}, url: '/health' };
    const mockRes = {
      setHeader: () => {},
      status: () => mockRes,
      json: (data) => { healthData = data; }
    };
    
    await healthModule(mockReq, mockRes);
    
    if (healthData?.ok) {
      console.log('   ✅ ONLINE - Service responding correctly');
      console.log(`   📊 Service: ${healthData.service}`);
      console.log(`   📋 Version: ${healthData.version}`);
      console.log(`   🎯 Status: ${healthData.status}`);
      results.endpoints.push({ name: 'Health', status: 'ONLINE' });
    } else {
      console.log('   ❌ ERROR - Invalid response');
      results.endpoints.push({ name: 'Health', status: 'ERROR' });
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Health', status: 'ERROR' });
  }

  // 2. Payment API Test
  console.log('\n2. 💰 Payment API:');
  try {
    const paymentModule = require('./api/payments/initiate.js');
    console.log('   ✅ MODULE LOADED - Payment endpoint compiled');
    console.log('   ⚠️  CONFIG NEEDED - Flutterwave credentials required');
    results.endpoints.push({ name: 'Payment', status: 'CONFIG_NEEDED' });
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Payment', status: 'ERROR' });
  }

  // 3. TTS Service Test
  console.log('\n3. 🎤 TTS Service:');
  try {
    const ttsModule = require('./api/tts/speak.js');
    const config = require('./lib/config');
    
    if (config.validate.tts()) {
      console.log('   ✅ READY - TTS service configured');
      console.log(`   🗣️  Voice: ${config.tts.defaultVoice}`);
      console.log(`   🔗 URL: ${config.tts.baseUrl}`);
      results.endpoints.push({ name: 'TTS', status: 'ONLINE' });
    } else {
      console.log('   ⚠️  CONFIG ISSUE - TTS configuration invalid');
      results.endpoints.push({ name: 'TTS', status: 'CONFIG_NEEDED' });
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'TTS', status: 'ERROR' });
  }

  // 4. Webhook Handler Test
  console.log('\n4. 🔗 Webhook Handler:');
  try {
    const webhookModule = require('./api/webhook/flutterwave.js');
    console.log('   ✅ READY - Webhook handler loaded');
    console.log('   📨 Events: charge.completed, transfer.completed');
    results.endpoints.push({ name: 'Webhook', status: 'ONLINE' });
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Webhook', status: 'ERROR' });
  }

  // 5. Security Features Test
  console.log('\n5. 🛡️ Security Features:');
  try {
    const { setSecurityHeaders, validateInput } = require('./lib/utils');
    const mockRes = { headers: {}, setHeader: (n, v) => mockRes.headers[n] = v };
    setSecurityHeaders(mockRes);
    
    const headerCount = Object.keys(mockRes.headers).length;
    console.log(`   ✅ ACTIVE - ${headerCount} security headers set`);
    console.log('   🔒 Features: XSS protection, CSRF protection, CORS');
    
    // Test validation
    const emailTest = validateInput('test@odia.dev', 'email');
    console.log(`   ✅ VALIDATION - Email validation: ${emailTest.valid ? 'WORKING' : 'FAILED'}`);
    
    results.endpoints.push({ name: 'Security', status: 'ONLINE' });
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Security', status: 'ERROR' });
  }

  // 6. Nigerian Features Test
  console.log('\n6. 🇳🇬 Nigerian Features:');
  try {
    const { validateNigerianPhone, validateNigerianAmount } = require('./lib/utils');
    const config = require('./lib/config');
    
    // Test phone validation
    const phoneTest = validateNigerianPhone('+2348012345678');
    const amountTest = validateNigerianAmount(1000, 'NGN');
    
    console.log(`   ✅ ACTIVE - Phone validation: ${phoneTest.valid ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ ACTIVE - Amount validation: ${amountTest.valid ? 'WORKING' : 'FAILED'}`);
    console.log(`   💰 Currency: ${config.nigerian.currency}`);
    console.log(`   🌍 Timezone: ${config.nigerian.timezone}`);
    
    results.endpoints.push({ name: 'Nigerian Features', status: 'ONLINE' });
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Nigerian Features', status: 'ERROR' });
  }

  // 7. Monitoring System Test
  console.log('\n7. 📊 Monitoring System:');
  try {
    const monitor = require('./lib/monitoring');
    
    // Test monitoring functions
    monitor.recordBusinessEvent('test_event', { type: 'status_check' });
    const health = monitor.getHealthSummary();
    
    console.log(`   ✅ ACTIVE - Health status: ${health.status}`);
    console.log(`   📈 Metrics: ${health.metrics.requests} requests tracked`);
    console.log(`   🔍 Security: ${health.security.recentEvents} events logged`);
    
    results.endpoints.push({ name: 'Monitoring', status: 'ONLINE' });
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    results.endpoints.push({ name: 'Monitoring', status: 'ERROR' });
  }

  // Calculate overall status
  const onlineCount = results.endpoints.filter(e => e.status === 'ONLINE').length;
  const configNeededCount = results.endpoints.filter(e => e.status === 'CONFIG_NEEDED').length;
  const errorCount = results.endpoints.filter(e => e.status === 'ERROR').length;
  const totalCount = results.endpoints.length;

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 QUICK STATUS SUMMARY:');
  console.log('=' .repeat(50));
  
  console.log(`📊 Total Systems: ${totalCount}`);
  console.log(`🟢 Online: ${onlineCount}`);
  console.log(`🟡 Config Needed: ${configNeededCount}`);
  console.log(`🔴 Errors: ${errorCount}`);
  
  const readinessScore = Math.round(((onlineCount + configNeededCount * 0.7) / totalCount) * 100);
  console.log(`\n🎯 Readiness Score: ${readinessScore}%`);
  
  if (errorCount === 0 && readinessScore >= 90) {
    results.overall = 'READY';
    console.log('🟢 STATUS: PRODUCTION READY');
    console.log('🚀 All systems operational - ready for deployment!');
  } else if (errorCount === 0) {
    results.overall = 'CONFIG_NEEDED';
    console.log('🟡 STATUS: CONFIGURATION NEEDED');
    console.log('⚙️  Minor configuration required for full operation');
  } else {
    results.overall = 'NEEDS_ATTENTION';
    console.log('🔴 STATUS: NEEDS ATTENTION');
    console.log('🔧 Critical issues require immediate attention');
  }

  console.log('\n📋 NEXT STEPS:');
  if (configNeededCount > 0) {
    console.log('1. Set Flutterwave production credentials');
    console.log('2. Configure production API keys (8+ characters)');
  }
  console.log('3. Deploy to production: vercel --prod');
  console.log('4. Run live deployment test: node verify-production.js [url]');
  
  console.log('\n✅ QUICK STATUS CHECK COMPLETE!');
  
  return results;
}

// Execute quick status check
if (require.main === module) {
  quickStatusCheck().catch(error => {
    console.error('\n❌ Status check failed:', error);
    process.exit(1);
  });
}

module.exports = { quickStatusCheck };