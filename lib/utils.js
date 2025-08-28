const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const VALID_API_KEYS = (process.env.VALID_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key");
  res.setHeader("Vary", "Origin");
}

function handleOptions(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function jsonResponse(res, status, data) {
  setCors(res);
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(data);
}

function requireApiKey(req, res) {
  if (VALID_API_KEYS.length === 0) return true;
  
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
    jsonResponse(res, 401, { error: "Invalid or missing API key" });
    return false;
  }
  return true;
}

async function withRetry(fn, retries = 3) {
  const delays = [250, 500, 1000];
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i] || 1000));
    }
  }
}

module.exports = {
  setCors,
  handleOptions,
  jsonResponse,
  requireApiKey,
  withRetry
};
