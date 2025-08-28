﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿const config = require('./config');

// In-memory rate limiting (for simple cases)
const rateLimits = new Map();

function setSecurityHeaders(res) {
  // Enhanced security headers for fintech compliance
  res.setHeader("Access-Control-Allow-Origin", config.security.corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key,Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  res.setHeader("Vary", "Origin,Accept-Encoding");
  
  // Security headers for Nigerian banking compliance
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'self'");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  // Nigerian compliance headers
  res.setHeader("X-API-Version", config.app.version);
  res.setHeader("X-Request-ID", generateRequestId());
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

async function requireApiKey(req, res) {
  if (config.security.apiKeys.length === 0) {
    safeLog('warn', 'No API keys configured - security bypassed');
    return true;
  }
  
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  
  // Prevent timing attacks by always checking all keys
  let isValid = false;
  const startTime = Date.now();
  
  if (apiKey && typeof apiKey === 'string' && apiKey.length >= 8) {
    for (const validKey of config.security.apiKeys) {
      if (constantTimeCompare(apiKey, validKey)) {
        isValid = true;
        break;
      }
    }
  }
  
  // Ensure minimum processing time to prevent timing attacks
  const minTime = 10; // milliseconds
  const elapsed = Date.now() - startTime;
  if (elapsed < minTime) {
    await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
  }
  
  if (!isValid) {
    safeLog('warn', 'Invalid API key attempt', {
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      userAgent: req.headers['user-agent']?.substring(0, 50) || 'unknown'
    });
    
    jsonResponse(res, 401, {
      error: "Authentication failed",
      message: "Invalid or missing API key",
      code: "AUTH_001"
    });
    return false;
  }
  
  return true;
}

// Serverless-compatible rate limiting
// Uses simple request validation instead of in-memory storage
function checkRateLimit(req, res, maxRequests = null, windowMs = null) {
  // In serverless, we'll implement basic validation instead of complex rate limiting
  // For production, consider using:
  // - Vercel Edge Config
  // - Redis with Upstash
  // - Database-based counters
  
  const userAgent = req.headers['user-agent'] || '';
  const xForwardedFor = req.headers['x-forwarded-for'] || '';
  
  // Basic abuse prevention - block obviously malicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || pattern.test(xForwardedFor)
  );
  
  if (isSuspicious && process.env.NODE_ENV === 'production') {
    safeLog('warn', 'Blocked suspicious request:', { userAgent, xForwardedFor });
    jsonResponse(res, 429, {
      error: "Rate limit exceeded",
      message: "Too many requests detected",
      retry_after: 60
    });
    return false;
  }
  
  // For now, allow all requests but log for monitoring
  safeLog('info', 'Request allowed:', { 
    method: req.method, 
    url: req.url,
    userAgent: userAgent.substring(0, 50) // Truncate for logging
  });
  
  return true;
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

async function readJsonBody(req, maxSize = 1024 * 50) { // 50KB max
  const chunks = [];
  let totalSize = 0;
  
  try {
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        throw new Error('Request body too large');
      }
      chunks.push(chunk);
    }
    
    const raw = Buffer.concat(chunks).toString("utf8");
    
    // Input validation and sanitization
    if (!raw.trim()) {
      return {};
    }
    
    // Check for potential JSON bombs
    if (raw.length > maxSize || (raw.match(/\{/g) || []).length > 100) {
      throw new Error('Invalid JSON structure');
    }
    
    const parsed = JSON.parse(raw);
    
    // Sanitize the parsed object
    return sanitizeObject(parsed);
    
  } catch (error) {
    safeLog('error', 'JSON parsing error:', error.message);
    if (error.message.includes('too large')) {
      throw new Error('Request payload too large');
    }
    throw new Error('Invalid JSON format');
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
  validateEmail,
  sanitizeObject,
  constantTimeCompare,
  generateRequestId,
  validateInput
};

// Security utility functions
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

function sanitizeObject(obj, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return {};
  }
  
  if (!obj || typeof obj !== 'object') {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }
  
  const sanitized = {};
  const keys = Object.keys(obj).slice(0, 50); // Limit object keys
  
  for (const key of keys) {
    const sanitizedKey = sanitizeKey(key);
    if (sanitizedKey) {
      sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth, currentDepth + 1);
    }
  }
  
  return sanitized;
}

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Remove potential XSS and injection patterns
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .substring(0, 1000); // Limit string length
  }
  
  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  return null;
}

function sanitizeKey(key) {
  if (typeof key !== 'string') {
    return null;
  }
  
  // Only allow alphanumeric, underscore, and hyphen
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
  
  // Reject potentially dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  if (dangerousKeys.includes(sanitized)) {
    return null;
  }
  
  return sanitized || null;
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateInput(input, type, options = {}) {
  switch (type) {
    case 'email':
      return validateEmail(input);
    case 'phone':
      return validateNigerianPhone(input);
    case 'amount':
      return validateNigerianAmount(input, options.currency);
    case 'string':
      if (typeof input !== 'string') {
        return { valid: false, error: 'Must be a string' };
      }
      if (options.minLength && input.length < options.minLength) {
        return { valid: false, error: `Minimum length is ${options.minLength}` };
      }
      if (options.maxLength && input.length > options.maxLength) {
        return { valid: false, error: `Maximum length is ${options.maxLength}` };
      }
      return { valid: true };
    case 'number':
      if (typeof input !== 'number' || !isFinite(input)) {
        return { valid: false, error: 'Must be a valid number' };
      }
      if (options.min !== undefined && input < options.min) {
        return { valid: false, error: `Minimum value is ${options.min}` };
      }
      if (options.max !== undefined && input > options.max) {
        return { valid: false, error: `Maximum value is ${options.max}` };
      }
      return { valid: true };
    default:
      return { valid: false, error: 'Unknown validation type' };
  }
}
