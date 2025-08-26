import { z } from 'zod';

const healthSchema = z.object({
  include_dependencies: z.boolean().default(true).optional(),
  check_external_apis: z.boolean().default(false).optional()
});

export const healthTool = {
  title: 'System Health Check',
  description: 'Check ODIADEV system health and dependencies',
  inputSchema: healthSchema,
  handler: async (input: z.infer<typeof healthSchema>) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        name: 'ODIADEV MCP Server',
        version: '3.0.0',
        node_version: process.version,
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage()
      },
      environment: {
        node_env: process.env.NODE_ENV,
        has_flw_config: Boolean(process.env.FLW_SECRET_KEY),
        has_tts_config: Boolean(process.env.ODIA_TTS_BASE_URL),
        has_valid_api_keys: Boolean(process.env.VALID_API_KEYS)
      }
    };

    if (input.include_dependencies) {
      // Check critical dependencies
      const deps = {
        flutterwave: Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET_HASH),
        tts_service: Boolean(process.env.ODIA_TTS_BASE_URL),
        authentication: Boolean(process.env.VALID_API_KEYS)
      };
      
      Object.assign(health, { dependencies: deps });
    }

    if (input.check_external_apis) {
      // Ping external APIs (optional)
      const external = {
        flutterwave_api: 'unknown',
        tts_service: 'unknown'
      };

      try {
        if (process.env.ODIA_TTS_BASE_URL) {
          const ttsResponse = await fetch(process.env.ODIA_TTS_BASE_URL, { 
            method: 'HEAD',
            timeout: 5000 
          });
          external.tts_service = ttsResponse.ok ? 'healthy' : 'unhealthy';
        }
      } catch (error) {
        external.tts_service = 'error';
      }

      Object.assign(health, { external_apis: external });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(health, null, 2)
      }]
    };
  }
};
