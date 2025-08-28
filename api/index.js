export const config = { runtime: 'nodejs', maxDuration: 10 };
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
  return res.status(200).json({
    message: "Welcome to ODIADEV - Nigeria AI Infrastructure",
    version: "3.2.0",
    endpoints: {
      health: "/api/healthcheck",
      ttsSpeak: "/api/tts/speak",
      payInit: "/api/payments/initiate",
      flwHook: "/api/webhook/flutterwave"
    },
    status: "operational"
  });
}
