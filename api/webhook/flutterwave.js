const { ok, unauthorized, serverError, safeLog, handleOptions } = require('../../lib/utils');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';
const FLW_WEBHOOK_SECRET_HASH = process.env.FLW_WEBHOOK_SECRET_HASH || '';

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const sig = req.headers['verif-hash'];
    
    if (!FLW_WEBHOOK_SECRET_HASH || sig !== FLW_WEBHOOK_SECRET_HASH) {
      return unauthorized(res, 'Invalid webhook signature');
    }

    const data = req.body?.data || {};

    if (FLW_SECRET_KEY && data?.id) {
      try {
        const verifyRes = await fetch(https://api.flutterwave.com/v3/transactions/${data.id}/verify, {
          headers: {
            'Authorization': Bearer ${FLW_SECRET_KEY}`
          }
        });
        
        const verifyData = await verifyRes.json().catch(() => ({}));
        
        if (!verifyRes.ok || (verifyData?.data?.status !== 'successful' && verifyData?.data?.status !== 'success')) {
          safeLog('warn', 'Transaction verify failed', verifyData);
        }
      } catch (e) {
        safeLog('warn', 'Verify call failed', e?.message || e);
      }
    } else {
      safeLog('warn', 'Missing FLW_SECRET_KEY or data.id; skipping verify');
    }

    ok(res, {
      received: true,
      id: data?.id,
      tx_ref: data?.tx_ref,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    safeLog('error', 'Webhook error', err);
    serverError(res, 'Webhook processing failed');
  }
};
