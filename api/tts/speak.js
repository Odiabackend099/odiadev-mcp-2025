const CORS_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "https://odia.dev";
const TTS_URL = process.env.ODIA_TTS_BASE_URL || "https://odiadev-tts-plug-n-play.onrender.com/speak";
const TIMEOUT_MS = 30000;

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

  try {
    const body = await readJsonBody(req);

    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ error: "text field is required" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: body.text.slice(0, 500),
        voice: body.voice || "nigerian-female"
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      res.setHeader("Content-Type", "application/json");
      return res.status(502).json({
        error: "TTS service unavailable",
        status: response.status
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Cache-Control", "no-cache");
    res.status(200);
    res.end(buffer);

  } catch (error) {
    console.error("TTS Error:", error.message);
    res.setHeader("Content-Type", "application/json");

    if (error.name === "AbortError") {
      return res.status(408).json({ error: "Request timeout" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};
