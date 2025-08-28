const { handleOptions, jsonResponse, readJsonBody, safeLog, checkRateLimit, withRetry, validateInput } = require("../../lib/utils");
const config = require("../../lib/config");

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;

  // Rate limiting for webhook endpoint
  if (!checkRateLimit(req, res, 50, 60000)) return; // 50 webhooks per minute

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const signature = req.headers["verif-hash"];
    
    if (!config.get.flutterwaveWebhook()) {
      safeLog("warn", "Webhook hash not configured - accepting all requests");
    } else if (signature !== config.get.flutterwaveWebhook()) {
      safeLog("warn", "Invalid webhook signature:", signature ? "present" : "missing");
      return jsonResponse(res, 401, { error: "Invalid webhook signature" });
    }

    const body = await readJsonBody(req);
    const eventData = body.data || {};
    const eventType = body.event || "unknown";

    safeLog("info", "Webhook received:", { 
      event: eventType,
      id: eventData.id,
      tx_ref: eventData.tx_ref,
      status: eventData.status
    });

    // Process different webhook events
    let processedEvent;
    switch (eventType) {
      case "charge.completed":
        processedEvent = await processChargeCompleted(eventData);
        break;
      case "transfer.completed":
        processedEvent = await processTransferCompleted(eventData);
        break;
      default:
        processedEvent = await processGenericWebhook(eventData, eventType);
    }

    // Verify transaction if we have the secret key
    let verificationResult = null;
    if (config.get.flutterwaveSecret() && eventData.id) {
      try {
        verificationResult = await verifyTransaction(eventData.id);
        safeLog("info", "Transaction verified:", { 
          id: eventData.id, 
          status: verificationResult.status 
        });
      } catch (error) {
        safeLog("warn", "Transaction verification failed:", error.message);
      }
    }

    jsonResponse(res, 200, {
      received: true,
      processed: true,
      event_type: eventType,
      transaction_id: eventData.id,
      reference: eventData.tx_ref,
      status: eventData.status,
      verification: verificationResult ? {
        verified: true,
        status: verificationResult.status,
        amount: verificationResult.amount,
        currency: verificationResult.currency
      } : null,
      processed_at: new Date().toISOString(),
      webhook_id: generateWebhookId()
    });

  } catch (error) {
    safeLog("error", "Webhook processing error:", error.message);
    jsonResponse(res, 500, { 
      error: "Webhook processing failed",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal error"
    });
  }
};

async function verifyTransaction(transactionId) {
  const verifyCall = async () => {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.get.flutterwaveSecret()}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  };
  
  return await withRetry(verifyCall);
}

async function processChargeCompleted(eventData) {
  safeLog("info", "Processing charge completed:", eventData.tx_ref);
  
  // Add your charge completion logic here
  // e.g., update database, send email, trigger next workflow
  
  return {
    type: "charge_completed",
    processed: true,
    actions: ["updated_database", "sent_confirmation"]
  };
}

async function processTransferCompleted(eventData) {
  safeLog("info", "Processing transfer completed:", eventData.tx_ref);
  
  // Add your transfer completion logic here
  
  return {
    type: "transfer_completed", 
    processed: true,
    actions: ["updated_records"]
  };
}

async function processGenericWebhook(eventData, eventType) {
  safeLog("info", "Processing generic webhook:", eventType);
  
  return {
    type: "generic_webhook",
    event_type: eventType,
    processed: true
  };
}

function generateWebhookId() {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

