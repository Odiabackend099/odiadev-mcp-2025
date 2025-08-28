﻿const { setCors, handleOptions, jsonResponse } = require("../lib/utils");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  const healthData = {
    ok: true,
    service: "ODIADEV MCP Server",
    version: "4.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    domain: "https://mcp.odia.dev",
    build: process.env.VERCEL_GIT_COMMIT_SHA || "local-dev",
    environment: {
      node: process.version,
      platform: process.platform,
      runtime: "vercel-serverless",
      memory: process.memoryUsage(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    configuration: {
      ttsConfigured: Boolean(process.env.ODIA_TTS_BASE_URL),
      flutterwaveConfigured: Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH),
      apiKeysConfigured: Boolean(process.env.VALID_API_KEYS),
      corsOrigin: process.env.CORS_ALLOW_ORIGIN || "https://mcp.odia.dev"
    },
    mcp: {
      protocol: "2024-11-05",
      capabilities: ["tools", "resources", "prompts"],
      tools: ["payment_initiate", "text_to_speech", "health_check", "webhook_process"],
      agents: ["lexi", "miss", "atlas", "legal"]
    },
    nigerian_optimizations: {
      retry_logic: "3 attempts with exponential backoff",
      timeout_handling: "30 seconds for slow connections",
      network_friendly: "Minimal payloads for 2G/3G networks"
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
