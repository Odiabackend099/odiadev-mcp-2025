const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    message: "Welcome to ODIADEV - Nigeria's AI Infrastructure",
    company: "ODIADEV",
    version: "4.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/healthcheck - System health and status",
      payments: "/api/payments/initiate - Flutterwave payments",
      tts: "/api/tts/speak - Nigerian voice synthesis",
      webhooks: "/api/webhook/flutterwave - Payment webhooks"
    },
    agents: {
      lexi: "WhatsApp business automation",
      miss: "University academic support",
      atlas: "Luxury travel management",
      legal: "NDPR compliance assistant"
    },
    documentation: "https://docs.odia.dev",
    status: "production-ready"
  });
};
