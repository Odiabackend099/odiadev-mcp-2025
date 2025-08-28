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
    apiKeys: (process.env.VALID_API_KEYS || "")
      .split(",")
      .map(s => s.trim())
      .filter(key => key.length >= 8), // Minimum key length
    corsOrigin: process.env.CORS_ALLOW_ORIGIN || "https://mcp.odia.dev",
    rateLimit: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "100"),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "60000")
    },
    // Enhanced security settings
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || "51200"), // 50KB
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "30000"), // 30 seconds
    enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== "false",
    logSecurityEvents: process.env.LOG_SECURITY_EVENTS !== "false"
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
    const hasSecret = Boolean(config.flutterwave.secretKey && config.flutterwave.secretKey.startsWith('FLWSECK-'));
    const hasWebhook = Boolean(config.flutterwave.webhookHash && config.flutterwave.webhookHash.length >= 10);
    return hasSecret && hasWebhook;
  },
  
  tts: () => {
    try {
      const url = new URL(config.tts.baseUrl);
      return url.protocol === 'https:' && url.hostname.length > 0;
    } catch {
      return false;
    }
  },
  
  apiKeys: () => {
    return config.security.apiKeys.length > 0 && 
           config.security.apiKeys.every(key => key.length >= 8);
  },
  
  security: () => {
    const hasValidCors = config.security.corsOrigin.startsWith('https://');
    const hasValidRateLimit = config.security.rateLimit.maxRequests > 0;
    const hasValidTimeout = config.security.requestTimeout > 0;
    return hasValidCors && hasValidRateLimit && hasValidTimeout;
  },
  
  environment: () => {
    const requiredForProduction = [
      config.validate.flutterwave(),
      config.validate.apiKeys(),
      config.validate.security()
    ];
    
    if (process.env.NODE_ENV === 'production') {
      return requiredForProduction.every(Boolean);
    }
    
    return true; // Less strict for development
  }
};

// Safe getter functions with fallbacks
config.get = {
  flutterwaveSecret: () => config.flutterwave?.secretKey || "",
  flutterwavePublic: () => config.flutterwave?.publicKey || "",
  flutterwaveWebhook: () => config.flutterwave?.webhookHash || "",
  corsOrigin: () => config.security?.corsOrigin || "https://mcp.odia.dev",
  ttsBaseUrl: () => config.tts?.baseUrl || "https://odiadev-tts-plug-n-play.onrender.com/speak"
};

// Configuration validation on startup
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const warnings = [];
  const errors = [];
  
  // Critical validations
  if (!config.validate.security()) {
    errors.push('Security configuration invalid - check CORS and rate limiting');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!config.validate.flutterwave()) {
      errors.push('Flutterwave credentials missing or invalid in production');
    }
    
    if (!config.validate.apiKeys()) {
      errors.push('API keys not configured or too short in production');
    }
    
    if (!config.validate.environment()) {
      errors.push('Production environment validation failed');
    }
  } else {
    // Development warnings
    if (!config.validate.flutterwave()) {
      warnings.push('Flutterwave not fully configured - payments may fail');
    }
    
    if (!config.validate.apiKeys()) {
      warnings.push('No API keys configured - endpoints are unsecured');
    }
  }
  
  if (!config.validate.tts()) {
    warnings.push('TTS service not configured properly - verify URL');
  }
  
  // Report issues
  if (errors.length > 0) {
    console.error('[CONFIG] CRITICAL ERRORS:');
    errors.forEach(error => console.error(`  ❌ ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      console.error('[CONFIG] Production deployment blocked due to configuration errors');
      process.exit(1);
    }
  }
  
  if (warnings.length > 0) {
    console.warn('[CONFIG] Configuration warnings:');
    warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('[CONFIG] ✅ All configuration checks passed');
  }
}

module.exports = config;