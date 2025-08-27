const { ok, handleOptions } = require('../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  const healthData = {
    ok: true,
    service: 'ODIADEV MCP Server',
    domain: 'https://mcp.odia.dev',
    time: new Date().toISOString(),
    buildTime: new Date().toISOString(),
    version: '3.1.0',
    env: {
      node: process.version,
      ttsConfigured: Boolean(process.env.ODIA_TTS_BASE_URL) || false,
      flwConfigured: Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH) || false,
      apiKeysConfigured: Boolean(process.env.VALID_API_KEYS) || false
    },
    mcp: {
      protocol: '2024-11-05',
      capabilities: ['tools', 'resources'],
      tools: ['payment_initiate', 'text_to_speech', 'health_check']
    }
  };

  ok(res, healthData);
};
