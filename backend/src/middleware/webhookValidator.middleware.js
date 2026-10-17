const crypto = require('crypto');

/**
 * Validates Meta WhatsApp Webhook Inbound Signatures (X-Hub-Signature-256)
 */
function validateWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.warn('[Webhook Warning] WHATSAPP_APP_SECRET not configured. Signature validation bypassed.');
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
  }

  try {
    const rawBody = req.rawBody; // Populated by express json verify callback
    if (!rawBody) {
      return res.status(400).json({ error: 'Raw body required for HMAC verification' });
    }

    const hmac = crypto.createHmac('sha256', appSecret);
    const digest = `sha256=${hmac.update(rawBody).digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      return res.status(403).json({ error: 'Invalid HMAC signature' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Signature verification internal failure', details: err.message });
  }
}

module.exports = validateWebhookSignature;