const { handleOptions, jsonResponse, readJsonBody, withRetry, safeLog, checkRateLimit, validateNigerianPhone, validateNigerianAmount, validateEmail } = require("../../lib/utils");
const config = require("../../lib/config");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

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
  // Amount validation
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return { valid: false, error: "Valid amount (number > 0) is required" };
  }

  // Nigerian currency and amount limits
  const amountValidation = validateNigerianAmount(body.amount, body.currency);
  if (!amountValidation.valid) {
    return amountValidation;
  }

  // Customer validation
  if (!body.customer || !body.customer.email || !body.customer.name) {
    return { valid: false, error: "Customer email and name are required" };
  }

  // Email validation
  const emailValidation = validateEmail(body.customer.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Transaction reference validation
  if (!body.tx_ref || body.tx_ref.length < 6 || body.tx_ref.length > 50) {
    return { valid: false, error: "Transaction reference must be 6-50 characters" };
  }

  // Nigerian phone number validation (optional)
  if (body.customer.phone) {
    const phoneValidation = validateNigerianPhone(body.customer.phone);
    if (!phoneValidation.valid) {
      return phoneValidation;
    }
  }

  // Customer name validation
  if (body.customer.name.length < 2 || body.customer.name.length > 100) {
    return { valid: false, error: "Customer name must be 2-100 characters" };
  }

  // Currency validation
  const allowedCurrencies = ['NGN', 'USD', 'GHS', 'KES', 'UGX', 'TZS'];
  if (body.currency && !allowedCurrencies.includes(body.currency)) {
    return { valid: false, error: `Currency must be one of: ${allowedCurrencies.join(', ')}` };
  }

  // Redirect URL validation (basic)
  if (body.redirect_url) {
    try {
      new URL(body.redirect_url);
    } catch {
      return { valid: false, error: "Invalid redirect URL format" };
    }
  }

  // Title and description length validation
  if (body.title && body.title.length > 100) {
    return { valid: false, error: "Payment title must be under 100 characters" };
  }

  if (body.description && body.description.length > 500) {
    return { valid: false, error: "Payment description must be under 500 characters" };
  }

  return { valid: true };
}




