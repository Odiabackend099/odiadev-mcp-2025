const { setCors, handleOptions, jsonResponse, withRetry } = require("../lib/utils");

const TTS_URL = process.env.ODIA_TTS_BASE_URL || "https://odiadev-tts-plug-n-play.onrender.com/speak";
const TIMEOUT_MS = 30000;

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
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);

    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return jsonResponse(res, 400, { error: "text field is required" });
    }

    const ttsCall = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
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
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    const response = await withRetry(ttsCall);

    if (!response.ok) {
      return jsonResponse(res, 502, {
        error: "TTS service unavailable",
        status: response.status
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    setCors(res);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Cache-Control", "no-cache");
    res.status(200);
    res.end(buffer);

  } catch (error) {
    console.error("TTS Error:", error.message);
    
    if (error.name === "AbortError") {
      return jsonResponse(res, 408, { error: "Request timeout" });
    }

    return jsonResponse(res, 500, { error: "Internal server error" });
  }
};
