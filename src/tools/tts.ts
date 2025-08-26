import { z } from 'zod';

const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default('nigerian-female'),
  speed: z.number().min(0.5).max(2.0).default(1.0).optional(),
  format: z.enum(['mp3', 'wav']).default('mp3').optional()
});

export const ttsTool = {
  title: 'Text to Speech',
  description: 'Convert text to speech using Nigerian voice models',
  inputSchema: ttsSchema,
  handler: async (input: z.infer<typeof ttsSchema>) => {
    const TTS_URL = process.env.ODIA_TTS_BASE_URL!;
    const TIMEOUT_MS = 30000;
    
    try {
      const payload = {
        text: input.text,
        voice: input.voice || 'nigerian-female',
        speed: input.speed || 1.0,
        format: input.format || 'mp3'
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`TTS service error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            audio_data: audioBase64,
            format: input.format || 'mp3',
            voice: input.voice || 'nigerian-female',
            text_length: input.text.length,
            processing_time_ms: Date.now()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text', 
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'TTS processing failed',
            text_preview: input.text.substring(0, 100) + '...'
          }, null, 2)
        }]
      };
    }
  }
};
