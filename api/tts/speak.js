const { bad, serverError, requireApiKey, safeLog, handleOptions, setCors } = require('../../lib/utils');
const { z } = require('zod');

const TTS_URL = process.env.ODIA_TTS_BASE_URL || '';
const DEFAULT_VOICE = process.env.ODIA_TTS_DEFAULT_VOICE || 'nigerian-female';
const TIMEOUT_MS = Number(process.env.ODIA_TTS_TIMEOUT_MS || 30000);

const schema = z.object({
  text: z.string().min(1),
  voice: z.string().min(1).optional()
});

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }
  
  if (!requireApiKey(req, res)) return;

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return bad(res, parsed.error.message);
    }
    
    if (!TTS_URL) {
      return serverError(res, 'ODIA_TTS_BASE_URL not set');
    }

    const payload = {
      text: parsed.data.text,
      voice: parsed.data.voice || DEFAULT_VOICE
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstream = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).catch(e => { throw e; });

    clearTimeout(timeout);

    if (!upstream || !upstream.ok) {
      let detail = '-';
      try {
        detail = await upstream.text();
      } catch {}
      safeLog('warn', 'TTS upstream failed', upstream?.status, detail);
      return serverError(res, 'TTS upstream failed');
    }

    setCors(res);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;

    if (upstream.body && upstream.body.pipe) {
      upstream.body.pipe(res);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return serverError(res, 'TTS timeout');
    }
    safeLog('error', 'TTS proxy error', err);
    serverError(res, 'TTS proxy error');
  }
};
