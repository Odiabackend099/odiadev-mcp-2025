const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key");
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

  if (!FLW_SECRET_KEY) {
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: "Payment service not configured" });
  }

  try {
    const body = await readJsonBody(req);

    if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ error: "Valid amount required" });
    }

    if (!body.customer || !body.customer.email) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ error: "Customer email required" });
    }

    if (!body.tx_ref || body.tx_ref.length < 6) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ error: "Transaction reference required (min 6 chars)" });
    }

    const payload = {
      amount: body.amount,
      currency: body.currency || "NGN",
      tx_ref: body.tx_ref,
      customer: body.customer,
      redirect_url: body.redirect_url,
      meta: {
        source: "odiadev_mcp_server",
        timestamp: new Date().toISOString(),
        ...body.meta
      }
    };

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer 
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.data || !result.data.link) {
      res.setHeader("Content-Type", "application/json");
      return res.status(502).json({
        error: "Payment initialization failed",
        message: result.message || "Unknown error"
      });
    }

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      success: true,
      payment_link: result.data.link,
      transaction_id: result.data.id,
      reference: body.tx_ref,
      status: result.status
    });

  } catch (error) {
    console.error("Payment Error:", error.message);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: "Payment service error" });
  }
};
