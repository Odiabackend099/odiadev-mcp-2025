const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
function setCors(res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
}
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const ttsConfigured = Boolean(process.env.ODIA_TTS_BASE_URL);
  const apiKeysConfigured = Boolean(process.env.VALID_API_KEYS);
  const flwConfigured = Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json({
    ok: true,
    service: "ODIADEV MCP Server",
    domainHint: "mcp.odia.dev",
    version: "3.2.0",
    time: new Date().toISOString(),
    env: {
      node: process.version,
      ttsConfigured,
      apiKeysConfigured,
      flwConfigured
    }
  });
}