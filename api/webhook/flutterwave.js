const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
const WEBHOOK_HASH = process.env.FLW_WEBHOOK_SECRET_HASH || "";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,verif-hash");
  res.setHeader("Vary", "Origin");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const signature = req.headers["verif-hash"];

    if (!WEBHOOK_HASH || signature !== WEBHOOK_HASH) {
      res.setHeader("Content-Type", "application/json");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const body = await readJsonBody(req);
    const data = body.data || {};

    console.log("Webhook processed:", {
      id: data.id,
      tx_ref: data.tx_ref,
      status: data.status,
      timestamp: new Date().toISOString()
    });

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      received: true,
      transaction_id: data.id,
      reference: data.tx_ref,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};
