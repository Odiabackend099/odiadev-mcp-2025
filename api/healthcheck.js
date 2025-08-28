??const { handleOptions, jsonResponse } = require("../lib/utils");
const config = require("../lib/config");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  const healthData = {
    ok: true,
    service: config.app.name,
    version: config.app.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    domain: config.app.domain,
    build: process.env.VERCEL_GIT_COMMIT_SHA || "local-dev",
    environment: {
      node: process.version,
      platform: process.platform,
      runtime: "vercel-serverless",
      memory: process.memoryUsage(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    configuration: {
      ttsConfigured: config.validate.tts(),
      flutterwaveConfigured: config.validate.flutterwave(),
      apiKeysConfigured: config.validate.apiKeys(),
      corsOrigin: config.security.corsOrigin,
      environment: config.app.environment,
      rateLimit: {
        maxRequests: config.security.rateLimit.maxRequests,
        windowMs: config.security.rateLimit.windowMs
      }
    },
    mcp: {
      protocol: config.mcp.protocol,
      capabilities: config.mcp.capabilities,
      tools: config.mcp.tools,
      agents: config.mcp.agents
    },
    nigerian_optimizations: {
      retry_logic: "3 attempts with exponential backoff",
      timeout_handling: "30 seconds for slow connections",
      network_friendly: "Minimal payloads for 2G/3G networks",
      currency_support: config.nigerian.currency,
      amount_limits: {
        min: config.nigerian.minAmount,
        max: config.nigerian.maxAmount
      }
    },
    status: "fully_operational"
  };

  jsonResponse(res, 200, healthData);
};

// Test execution for local development
if (require.main === module) {
  const mockReq = { method: "GET", headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => console.log(`${code}: ${JSON.stringify(data, null, 2)}`),
      end: () => console.log(`${code}: Request completed`)
    })
  };
  module.exports(mockReq, mockRes);
}


