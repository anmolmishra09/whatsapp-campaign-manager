const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');
const db = require('../config/database');

/**
 * GET /api/settings/whatsapp/status
 * Queries Meta Graph API to verify credentials and fetch sender profile details.
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    const metaCheck = await whatsappService.verifySenderProfile();
    return res.json({
      success: true,
      data: {
        status: 'verified',
        phone_number_id: metaCheck.id,
        display_phone_number: metaCheck.display_phone_number || process.env.WHATSAPP_SENDER_DEFAULT_NUMBER,
        quality_rating: metaCheck.quality_rating
      }
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      data: {
        status: 'unverified',
        phone_number: process.env.WHATSAPP_SENDER_DEFAULT_NUMBER,
        message: err.message
      }
    });
  }
});

/**
 * POST /api/settings/whatsapp/verify
 * Saves or updates verified sender account details in PostgreSQL.
 */
router.post('/whatsapp/verify', async (req, res) => {
  const { phone_number_id, waba_id, phone_number } = req.body;

  if (!phone_number_id || !waba_id) {
    return res.status(400).json({
      error: 'Missing required fields: phone_number_id and waba_id are mandatory.'
    });
  }

  try {
    await db.query(`
      INSERT INTO sender_profiles (name, phone_number, phone_number_id, waba_id, status, is_default)
      VALUES ('Primary Account', $1, $2, $3, 'verified', TRUE)
      ON CONFLICT (phone_number_id) 
      DO UPDATE SET 
        phone_number = EXCLUDED.phone_number,
        waba_id = EXCLUDED.waba_id,
        status = 'verified',
        updated_at = CURRENT_TIMESTAMP
    `, [phone_number || process.env.WHATSAPP_SENDER_DEFAULT_NUMBER, phone_number_id, waba_id]);

    return res.json({ success: true, message: 'Sender profile registered successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Profile persistence failure', details: err.message });
  }
});

/**
 * POST /api/settings/whatsapp/test-send
 * Sends an isolated test message directly to verify Meta API dispatch without queueing.
 */
router.post('/whatsapp/test-send', async (req, res) => {
  const { recipient, message } = req.body;

  if (!recipient) {
    return res.status(400).json({ error: 'Recipient phone number is required.' });
  }

  try {
    const text = message || 'Test verification message from WhatsApp Campaign Manager.';
    const result = await whatsappService.sendTextMessage(recipient, text);
    return res.json({ success: true, result });
  } catch (err) {
    const details = err.response ? err.response.data : err.message;
    return res.status(500).json({ error: 'Meta dispatch failed', details });
  }
});

module.exports = router;