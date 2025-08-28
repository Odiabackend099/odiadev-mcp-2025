﻿﻿﻿﻿﻿﻿﻿﻿﻿const { handleOptions, jsonResponse, readJsonBody, withRetry, safeLog, setSecurityHeaders, checkRateLimit, requireApiKey, validateInput } = require("../../lib/utils");
const config = require("../../lib/config");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  // API key authentication
  if (!(await requireApiKey(req, res))) return;

  // Rate limiting for TTS endpoint
  if (!checkRateLimit(req, res, 10, 60000)) return; // 10 requests per minute for TTS

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
      const timeout = setTimeout(() => controller.abort(), config.tts.timeout);

      try {
        const response = await fetch(config.tts.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": `${config.app.name}/${config.app.version}`
          },
          body: JSON.stringify({
            text: body.text.slice(0, config.tts.maxTextLength), // Prevent abuse
            voice: body.voice || config.tts.defaultVoice,
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
      voice: body.voice || config.tts.defaultVoice
    });

    // Set proper headers for audio response
    setSecurityHeaders(res);
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
  // Enhanced text validation
  const textValidation = validateInput(body.text, 'string', {
    minLength: 1,
    maxLength: config.tts.maxTextLength
  });
  
  if (!textValidation.valid) {
    return { valid: false, error: `Text validation failed: ${textValidation.error}` };
  }

  if (body.text.trim().length === 0) {
    return { valid: false, error: "Text cannot be empty or only whitespace" };
  }

  // Check for potentially harmful content
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /data:.*base64/i,
    /\beval\s*\(/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(body.text))) {
    return { valid: false, error: "Text contains potentially harmful content" };
  }

  // Voice validation with specific allowed voices
  const allowedVoices = ["nigerian-female", "nigerian-male", "en-us-female", "en-us-male"];
  if (body.voice && !allowedVoices.includes(body.voice)) {
    return { valid: false, error: `Invalid voice. Allowed: ${allowedVoices.join(", ")}` };
  }

  // Speed validation (optional parameter)
  if (body.speed !== undefined) {
    const speedValidation = validateInput(body.speed, 'number', { min: 0.5, max: 2.0 });
    if (!speedValidation.valid) {
      return { valid: false, error: `Invalid speed: ${speedValidation.error}` };
    }
  }

  // Pitch validation (optional parameter)
  if (body.pitch !== undefined) {
    const pitchValidation = validateInput(body.pitch, 'number', { min: 0.5, max: 2.0 });
    if (!pitchValidation.valid) {
      return { valid: false, error: `Invalid pitch: ${pitchValidation.error}` };
    }
  }

  return { valid: true };
}
