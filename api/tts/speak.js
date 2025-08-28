const { setCors, handleOptions, jsonResponse, readJsonBody, withRetry, safeLog } = require("../../lib/utils");

const TTS_URL = process.env.ODIA_TTS_BASE_URL || "https://odiadev-tts-plug-n-play.onrender.com/speak";
const TIMEOUT_MS = parseInt(process.env.ODIA_TTS_TIMEOUT_MS || "30000");
const MAX_TEXT_LENGTH = parseInt(process.env.ODIA_TTS_MAX_TEXT_LENGTH || "500");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    safeLog("info", "TTS request:", { textLength: body.text?.length, voice: body.voice });

    // Validate input
    const validation = validateTTSRequest(body);
    if (!validation.valid) {
      return jsonResponse(res, 400, { error: validation.error });
    }

    const ttsCall = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(TTS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "ODIADEV-MCP-Server/4.1.0"
          },
          body: JSON.stringify({
            text: body.text.slice(0, MAX_TEXT_LENGTH), // Prevent abuse
            voice: body.voice || "nigerian-female",
            speed: body.speed || 1.0,
            pitch: body.pitch || 1.0
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`TTS service error: ${response.status} ${response.statusText}`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    const response = await withRetry(ttsCall);
    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    safeLog("info", "TTS successful:", { 
      textLength: body.text.length, 
      audioSize: buffer.length,
      voice: body.voice || "nigerian-female"
    });

    // Set proper headers for audio response
    setCors(res);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.setHeader("Content-Disposition", 'inline; filename="speech.mp3"');
    
    res.status(200);
    res.end(buffer);

  } catch (error) {
    safeLog("error", "TTS Error:", error.message);
    
    if (error.name === "AbortError") {
      return jsonResponse(res, 408, { 
        error: "Request timeout",
        message: "TTS service took too long to respond. Try with shorter text."
      });
    }

    if (error.message.includes("TTS service error")) {
      return jsonResponse(res, 502, { 
        error: "TTS service unavailable",
        message: "The text-to-speech service is currently unavailable. Please try again later."
      });
    }

    jsonResponse(res, 500, { 
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "TTS processing failed"
    });
  }
};

function validateTTSRequest(body) {
  if (!body.text || typeof body.text !== "string") {
    return { valid: false, error: "Text field is required and must be a string" };
  }

  if (body.text.trim().length === 0) {
    return { valid: false, error: "Text cannot be empty" };
  }

  if (body.text.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed.` };
  }

  // Optional voice validation
  const allowedVoices = ["nigerian-female", "nigerian-male", "en-us-female", "en-us-male"];
  if (body.voice && !allowedVoices.includes(body.voice)) {
    return { valid: false, error: `Invalid voice. Allowed: ${allowedVoices.join(", ")}` };
  }

  return { valid: true };
}
