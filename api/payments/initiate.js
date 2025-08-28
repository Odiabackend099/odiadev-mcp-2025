const { handleOptions, jsonResponse, readJsonBody, withRetry, safeLog, checkRateLimit, validateNigerianPhone, validateNigerianAmount, validateEmail, requireApiKey, validateInput } = require("../../lib/utils");
const config = require("../../lib/config");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  // API key authentication
  if (!(await requireApiKey(req, res))) return;

  // Rate limiting for payment endpoint
  if (!checkRateLimit(req, res, 20, 60000)) return; // 20 requests per minute

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  if (!config.get.flutterwaveSecret()) {
    return jsonResponse(res, 500, { 
      error: "Payment service not configured",
      hint: "Set FLW_SECRET_KEY in environment variables"
    });
  }

  try {
    const body = await readJsonBody(req);
    safeLog("info", "Payment initiation request:", { tx_ref: body.tx_ref, amount: body.amount });

    // Validate required fields
    const validation = validatePaymentRequest(body);
    if (!validation.valid) {
      return jsonResponse(res, 400, { error: validation.error });
    }

    const payload = {
      amount: body.amount,
      currency: body.currency || "NGN",
      tx_ref: body.tx_ref,
      customer: {
        email: body.customer.email,
        name: body.customer.name,
        phonenumber: body.customer.phone || ""
      },
      customizations: {
        title: body.title || "ODIADEV Payment",
        description: body.description || "Payment via ODIADEV MCP Server",
        logo: "https://odia.dev/logo.png"
      },
      redirect_url: body.redirect_url || "https://odia.dev/payment/callback",
      meta: {
        source: "odiadev_mcp_server",
        agent: body.agent || "lexi",
        timestamp: new Date().toISOString(),
        version: "4.1.0",
        ...body.meta
      }
    };

    const paymentCall = async () => {
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.get.flutterwaveSecret()}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Flutterwave API error: ${error.message}`);
      }

      return await response.json();
    };

    const result = await withRetry(paymentCall);

    if (!result.data || !result.data.link) {
      safeLog("error", "Payment initialization failed:", result);
      return jsonResponse(res, 502, {
        error: "Payment initialization failed",
        message: result.message || "Invalid response from payment provider"
      });
    }

    safeLog("info", "Payment initialized successfully:", { 
      tx_ref: body.tx_ref, 
      transaction_id: result.data.id 
    });

    jsonResponse(res, 200, {
      success: true,
      payment_link: result.data.link,
      transaction_id: result.data.id,
      reference: body.tx_ref,
      status: result.status,
      amount: body.amount,
      currency: body.currency || "NGN",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

  } catch (error) {
    safeLog("error", "Payment Error:", error.message);
    jsonResponse(res, 500, { 
      error: "Payment service error",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

function validatePaymentRequest(body) {
  // Enhanced input validation for Nigerian fintech compliance
  
  // Amount validation with proper type checking
  const amountValidation = validateInput(body.amount, 'number', { min: 1, max: 50000000 });
  if (!amountValidation.valid) {
    return { valid: false, error: `Invalid amount: ${amountValidation.error}` };
  }

  // Nigerian currency and amount limits
  const nigerianAmountValidation = validateNigerianAmount(body.amount, body.currency);
  if (!nigerianAmountValidation.valid) {
    return nigerianAmountValidation;
  }

  // Customer validation with enhanced checks
  if (!body.customer || typeof body.customer !== 'object') {
    return { valid: false, error: "Customer information is required" };
  }

  // Email validation
  if (!body.customer.email) {
    return { valid: false, error: "Customer email is required" };
  }
  const emailValidation = validateEmail(body.customer.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Name validation with length checks
  const nameValidation = validateInput(body.customer.name, 'string', { minLength: 2, maxLength: 100 });
  if (!nameValidation.valid) {
    return { valid: false, error: `Invalid customer name: ${nameValidation.error}` };
  }

  // Transaction reference validation
  const txRefValidation = validateInput(body.tx_ref, 'string', { minLength: 6, maxLength: 50 });
  if (!txRefValidation.valid) {
    return { valid: false, error: `Invalid transaction reference: ${txRefValidation.error}` };
  }

  // Nigerian phone number validation (optional but if provided must be valid)
  if (body.customer.phone) {
    const phoneValidation = validateNigerianPhone(body.customer.phone);
    if (!phoneValidation.valid) {
      return phoneValidation;
    }
  }

  // Currency validation with Nigerian focus
  const allowedCurrencies = ['NGN', 'USD', 'GHS', 'KES', 'UGX', 'TZS'];
  if (body.currency && !allowedCurrencies.includes(body.currency)) {
    return { valid: false, error: `Currency must be one of: ${allowedCurrencies.join(', ')}` };
  }

  // Redirect URL validation (if provided)
  if (body.redirect_url) {
    try {
      const url = new URL(body.redirect_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: "Redirect URL must use HTTP or HTTPS" };
      }
    } catch {
      return { valid: false, error: "Invalid redirect URL format" };
    }
  }

  // Title and description validation
  if (body.title) {
    const titleValidation = validateInput(body.title, 'string', { maxLength: 100 });
    if (!titleValidation.valid) {
      return { valid: false, error: `Invalid title: ${titleValidation.error}` };
    }
  }

  if (body.description) {
    const descValidation = validateInput(body.description, 'string', { maxLength: 500 });
    if (!descValidation.valid) {
      return { valid: false, error: `Invalid description: ${descValidation.error}` };
    }
  }

  // Meta validation (if provided)
  if (body.meta && typeof body.meta === 'object') {
    const metaKeys = Object.keys(body.meta);
    if (metaKeys.length > 10) {
      return { valid: false, error: "Too many metadata fields (max 10)" };
    }
  }

  return { valid: true };
}




