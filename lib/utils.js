const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || 'https://odia.dev';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

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

function json(res, status, data) {
  setCors(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).end(JSON.stringify(data));
}

function ok(res, data) { json(res, 200, data); }
function bad(res, message) { json(res, 400, { error: message }); }
function unauthorized(res, message = 'Unauthorized') { json(res, 401, { error: message }); }
function serverError(res, message = 'Server error') { json(res, 500, { error: message }); }

const VALID_KEYS = (process.env.VALID_API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);

function requireApiKey(req, res) {
  if (!VALID_KEYS.length) return true;
  const key = req.headers['x-api-key'] || req.query?.api_key;
  if (!key || !VALID_KEYS.includes(String(key))) {
    unauthorized(res, 'Invalid or missing API key');
    return false;
  }
  return true;
}

function safeLog(level, ...args) {
  const rank = { error: 0, warn: 1, info: 2, debug: 3 };
  const lvl = rank[level] ?? 2;
  const max = rank[LOG_LEVEL] ?? 2;
  if (lvl <= max) console[level](...args);
}

module.exports = {
  json, ok, bad, unauthorized, serverError,
  requireApiKey, safeLog, handleOptions, setCors
};
