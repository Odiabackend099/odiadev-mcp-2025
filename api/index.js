﻿const { handleOptions, jsonResponse } = require("../lib/utils");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  const welcomeData = {
    message: "Welcome to ODIADEV - Nigeria's AI Infrastructure",
    company: "ODIADEV",
    version: "4.1.0",
    timestamp: new Date().toISOString(),
    status: "operational",
    endpoints: {
      health: "/api/healthcheck - System health and status",
      payments: "/api/payments/initiate - Flutterwave payment processing",
      tts: "/api/tts/speak - Nigerian voice text-to-speech",
      webhooks: "/api/webhook/flutterwave - Payment event processing"
    },
    agents: {
      lexi: "WhatsApp business automation and customer onboarding",
      miss: "University academic support for Nigerian institutions",
      atlas: "Luxury travel and VIP client management", 
      legal: "NDPR compliance and legal document processing"
    },
    features: [
      "Nigerian network optimized (3G/4G friendly)",
      "Flutterwave payment integration",
      "Multi-language TTS support",
      "CORS configured for Nigerian domains",
      "Automatic retry logic for unreliable connections"
    ],
    documentation: "https://docs.odia.dev",
    support: "https://support.odia.dev"
  };

  jsonResponse(res, 200, welcomeData);
};
