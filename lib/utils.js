﻿﻿const config = require('./config');

// In-memory rate limiting (for simple cases)
const rateLimits = new Map();

function setSecurityHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", config.security.corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key,Authorization");
  res.setHeader("Vary", "Origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function handleOptions(req, res) {
  setSecurityHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function jsonResponse(res, status, data) {
  setSecurityHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function requireApiKey(req, res) {
  if (config.security.apiKeys.length === 0) return true;
  
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  if (!apiKey || !config.security.apiKeys.includes(apiKey)) {
    jsonResponse(res, 401, { error: "Invalid or missing API key" });
    return false;
  }
  return true;
}

// Enhanced rate limiting with cleanup
function checkRateLimit(req, res, maxRequests = null, windowMs = null) {
  const limits = {
    maxRequests: maxRequests || config.security.rateLimit.maxRequests,
    windowMs: windowMs || config.security.rateLimit.windowMs
  };
  
  const key = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - limits.windowMs;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }
  
  // Clean old entries
  const requests = rateLimits.get(key).filter(time => time > windowStart);
  
  if (requests.length >= limits.maxRequests) {
    jsonResponse(res, 429, { 
      error: "Too many requests",
      retry_after: Math.ceil(limits.windowMs / 1000),
      limit: limits.maxRequests,
      window: limits.windowMs
    });
    return false;
  }
  
  requests.push(now);
  rateLimits.set(key, requests);
  
  // Periodic cleanup to prevent memory leaks
  if (Math.random() < 0.01) { // 1% chance
    cleanupRateLimits(windowStart);
  }
  
  return true;
}

function cleanupRateLimits(cutoff) {
  for (const [key, requests] of rateLimits.entries()) {
    const validRequests = requests.filter(time => time > cutoff);
    if (validRequests.length === 0) {
      rateLimits.delete(key);
    } else {
      rateLimits.set(key, validRequests);
    }
  }
}

// Nigerian network optimization - 3 retries with exponential backoff
async function withRetry(fn, retries = 3) {
  const delays = [250, 500, 1000]; // Optimized for MTN/Airtel/Glo networks
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      safeLog('warn', `Retry ${i + 1}/${retries} after ${delays[i] || 1000}ms...`);
      await new Promise(resolve => setTimeout(resolve, delays[i] || 1000));
    }
  }
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

function safeLog(level, ...args) {
  const timestamp = new Date().toISOString();
  const safeArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return arg.replace(/FLWSECK-[^\s"]+/g, '[REDACTED_SECRET]')
                .replace(/FLWPUBK-[^\s"]+/g, '[REDACTED_PUBLIC]');
    }
    return arg;
  });
  console[level](`[${timestamp}]`, ...safeArgs);
}

// Nigerian-specific validation functions
function validateNigerianPhone(phone) {
  if (!phone) return { valid: true }; // Optional field
  const cleanPhone = phone.replace(/\s/g, '');
  if (!config.nigerian.phoneRegex.test(cleanPhone)) {
    return { valid: false, error: "Invalid Nigerian phone number format" };
  }
  return { valid: true };
}

function validateNigerianAmount(amount, currency = 'NGN') {
  if (currency === 'NGN') {
    if (amount < config.nigerian.minAmount || amount > config.nigerian.maxAmount) {
      return { 
        valid: false, 
        error: `Amount must be between ₦${config.nigerian.minAmount / 100} and ₦${config.nigerian.maxAmount / 100}` 
      };
    }
  }
  return { valid: true };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Valid email address required" };
  }
  return { valid: true };
}

module.exports = {
  setSecurityHeaders,
  handleOptions,
  jsonResponse,
  requireApiKey,
  checkRateLimit,
  withRetry,
  readJsonBody,
  safeLog,
  validateNigerianPhone,
  validateNigerianAmount,
  validateEmail
};
