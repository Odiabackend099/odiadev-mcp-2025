export const config = { runtime: 'nodejs', maxDuration: 10 };
const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
const H = process.env.FLW_WEBHOOK_SECRET_HASH || "";

function setCors(res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, verif-hash");
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

  const sig = req.headers["verif-hash"];
  if (!H || sig !== H) return res.status(401).json({ error: "Invalid webhook signature" });

  const body = typeof req.body==="object" && req.body ? req.body : await readJson(req);
  const data = body?.data || {};
  if (FLW_SECRET_KEY && data?.id){
    try {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/${data.id}/verify`, {
        headers: { "Authorization": `Bearer ${FLW_SECRET_KEY}` }
      });
      const v = await r.json().catch(()=> ({}));
      if (!r.ok) console.warn("Verify failed", v);
    } catch(e){ console.warn("Verify error", e?.message||e); }
  }

  return res.status(200).json({ received:true, id:data?.id, tx_ref:data?.tx_ref, ts: new Date().toISOString() });
}
