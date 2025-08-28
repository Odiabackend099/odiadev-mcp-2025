// lib/config.js - Centralized configuration for ODIADEV MCP Server

const config = {
  // Flutterwave configuration with fallback support
  flutterwave: {
    secretKey: process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || "",
    publicKey: process.env.FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || "",
    encryptionKey: process.env.FLW_ENCRYPTION_KEY || process.env.FLUTTERWAVE_ENCRYPTION_KEY || "",
    webhookHash: process.env.FLW_WEBHOOK_SECRET_HASH || process.env.FLUTTERWAVE_WEBHOOK_SECRET || ""
  },

  // Text-to-Speech configuration
  tts: {
    baseUrl: process.env.ODIA_TTS_BASE_URL || "https://odiadev-tts-plug-n-play.onrender.com/speak",
    defaultVoice: process.env.ODIA_TTS_DEFAULT_VOICE || "nigerian-female",
    timeout: parseInt(process.env.ODIA_TTS_TIMEOUT_MS || "30000"),
    maxTextLength: parseInt(process.env.ODIA_TTS_MAX_TEXT_LENGTH || "500")
  },

  // Security and API configuration
  security: {
    apiKeys: (process.env.VALID_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean),
    corsOrigin: process.env.CORS_ALLOW_ORIGIN || "https://odia.dev",
    rateLimit: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "100"),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "60000")
    }
  },

  // Nigerian-specific settings
  nigerian: {
    currency: "NGN",
    minAmount: 100, // ₦1.00
    maxAmount: 50000000, // ₦500,000.00
    phoneRegex: /^(\+234|234|0)?[789][01]\d{8}$/,
    timezone: "Africa/Lagos"
  },

  // Application settings
  app: {
    name: "ODIADEV MCP Server",
    version: process.env.npm_package_version || "4.1.0",
    domain: "https://mcp.odia.dev",
    environment: process.env.NODE_ENV || "development"
  },

  // MCP Protocol settings
  mcp: {
    protocol: "2024-11-05",
    capabilities: ["tools", "resources", "prompts"],
    tools: ["payment_initiate", "text_to_speech", "health_check", "webhook_process"],
    agents: ["lexi", "miss", "atlas", "legal"]
  }
};

// Validation functions
config.validate = {
  flutterwave: () => {
    return Boolean(config.flutterwave.secretKey && config.flutterwave.webhookHash);
  },
  
  tts: () => {
    return Boolean(config.tts.baseUrl);
  },
  
  apiKeys: () => {
    return config.security.apiKeys.length > 0;
  }
};

module.exports = config;