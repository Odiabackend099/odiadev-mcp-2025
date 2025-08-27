const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
const VALID_KEYS = (process.env.VALID_API_KEYS || "").split(",").map(s=>s.trim()).filter(Boolean);

function setCors(res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
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
  if (!FLW_SECRET_KEY) return res.status(500).json({ error: "FLW_SECRET_KEY not configured" });

  const b = typeof req.body==="object" && req.body ? req.body : await readJson(req);
  const { amount, currency="NGN", tx_ref, customer={}, redirect_url, meta } = b||{};
  if (!amount || typeof amount !== "number" || amount <= 0) return res.status(400).json({ error: "amount must be positive number" });
  if (!tx_ref || String(tx_ref).length < 6) return res.status(400).json({ error: "tx_ref must be at least 6 chars" });
  if (!customer?.email) return res.status(400).json({ error: "customer.email required" });

  const payload = { amount, currency, tx_ref, customer, redirect_url, meta: { ...meta, source:"mcp_server" } };
  const fw = await fetch("https://api.flutterwave.com/v3/payments", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": `Bearer ${FLW_SECRET_KEY}`
    },
    body: JSON.stringify(payload)
  });
  const j = await fw.json().catch(()=> ({}));
  if (!fw.ok || !j?.data?.link) return res.status(502).json({ error: j?.message || "Flutterwave error", detail: j });

  return res.status(200).json({
    success: true,
    link: j.data.link,
    id: j.data.id,
    status: j.status,
    tx_ref
  });
}