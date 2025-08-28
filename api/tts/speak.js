export const config = { runtime: 'nodejs', maxDuration: 10 };
const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const TTS_URL = process.env.ODIA_TTS_BASE_URL || "https://odiadev-tts-plug-n-play.onrender.com/speak";
const DEFAULT_VOICE = process.env.ODIA_TTS_DEFAULT_VOICE || "nigerian-female";
const TIMEOUT_MS = Number(process.env.ODIA_TTS_TIMEOUT_MS || 30000);
const VALID_KEYS = (process.env.VALID_API_KEYS || "").split(",").map(s=>s.trim()).filter(Boolean);

function setCors(res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
}
function requireApiKey(req, res){
  if (!VALID_KEYS.length) return true;
  const k = req.headers["x-api-key"] || req.query?.api_key;
  if (!k || !VALID_KEYS.includes(String(k))) {
    setCors(res);
    res.status(401).json({ error: "Invalid or missing API key" });
    return false;
  }
  return true;
}
async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res){
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!requireApiKey(req,res)) return;

  const body = typeof req.body === "object" && req.body ? req.body : await readJson(req);
  if (!body?.text || typeof body.text !== "string") return res.status(400).json({ error: "text is required" });

  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(TTS_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text: body.text, voice: body.voice || DEFAULT_VOICE }),
      signal: controller.signal
    });
    clearTimeout(t);
    if (!upstream.ok) {
      const detail = await upstream.text().catch(()=> "");
      return res.status(502).json({ error:"TTS upstream failed", detail });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 200; res.end(buf);
  } catch (e){
    clearTimeout(t);
    return res.status(500).json({ error: e?.name==="AbortError" ? "TTS timeout" : "TTS proxy error" });
  }
}
