// ODIADEV MCP Server - Health Check Endpoint
// Self-contained serverless function

const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || 'https://odia.dev';

function setCors(res) {
  if (ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

function handleOptions(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function ok(res, data) {
  setCors(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json(data);
}

export default async function handler(req, res) {
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
      ttsConfigured: Boolean(process.env.ODIA_TTS_BASE_URL),
      flwConfigured: Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH),
      apiKeysConfigured: Boolean(process.env.VALID_API_KEYS)
    },
    mcp: {
      protocol: '2024-11-05',
      capabilities: ['tools', 'resources'],
      tools: ['payment_initiate', 'text_to_speech', 'health_check']
    }
  };

  ok(res, healthData);
}
