const { setCors, handleOptions, jsonResponse, readJsonBody, withRetry, safeLog } = require("../../lib/utils");

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || "";

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  if (!FLW_SECRET_KEY) {
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
          "Authorization": `Bearer ${FLW_SECRET_KEY}`
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
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return { valid: false, error: "Valid amount (number > 0) is required" };
  }

  if (!body.customer || !body.customer.email || !body.customer.name) {
    return { valid: false, error: "Customer email and name are required" };
  }

  if (!body.tx_ref || body.tx_ref.length < 6) {
    return { valid: false, error: "Transaction reference required (minimum 6 characters)" };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer.email)) {
    return { valid: false, error: "Valid customer email is required" };
  }

  return { valid: true };
}
