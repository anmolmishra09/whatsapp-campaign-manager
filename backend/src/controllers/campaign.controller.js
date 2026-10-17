const db = require('../config/database');
const { campaignQueue } = require('../config/queue');
const whatsappService = require('../services/whatsapp.service');
const path = require('path');

class CampaignController {
  async create(req, res) {
    const client = await db.getClient();
    try {
      const { name, message_type, raw_message } = req.body;
      const recipients = JSON.parse(req.body.recipients || '[]');

      if (!name || !recipients.length) {
        return res.status(400).json({ error: 'Campaign name and at least one recipient are mandatory.' });
      }

      // Check for default sender
      const senderRes = await client.query('SELECT id, phone_number_id FROM sender_profiles WHERE is_default = TRUE LIMIT 1');
      if (senderRes.rows.length === 0) {
        return res.status(400).json({ error: 'No default registered WhatsApp sender found. Verify configuration first.' });
      }
      const sender = senderRes.rows[0];

      let mediaId = null;
      let mediaFilename = null;

      // Handle PDF media upload to WhatsApp API if present
      if (req.file) {
        mediaFilename = req.file.originalname;
        mediaId = await whatsappService.uploadMedia(req.file.path, 'application/pdf');
      }

      await client.query('BEGIN');

      const campaignInsert = await client.query(
        `INSERT INTO campaigns (sender_id, name, message_type, raw_message, media_whatsapp_id, media_filename, total_contacts, eligible_contacts, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'running')
         RETURNING id`,
        [sender.id, name, message_type, raw_message, mediaId, mediaFilename, recipients.length, recipients.length]
      );

      const campaignId = campaignInsert.rows[0].id;

      // Filter against suppression list
      const suppressedListRes = await client.query('SELECT phone_number FROM suppression_list');
      const suppressedSet = new Set(suppressedListRes.rows.map(r => r.phone_number));

      const jobsToEnqueue = [];

      for (const rec of recipients) {
        const isSuppressed = suppressedSet.has(rec.phone);
        const status = isSuppressed ? 'skipped' : 'pending';
        const failureReason = isSuppressed ? 'Opted out via suppression list' : null;

        const recInsert = await client.query(
          `INSERT INTO campaign_recipients (campaign_id, phone_number, contact_name, status, failure_reason)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [campaignId, rec.phone, rec.name, status, failureReason]
        );

        const recId = recInsert.rows[0].id;

        if (!isSuppressed) {
          // Render personalized message
          const personalized = (raw_message || '')
            .replace(/{{name}}/g, rec.name || 'Valued Customer')
            .replace(/{{phone}}/g, rec.phone)
            .replace(/{{company}}/g, rec.company || '');

          jobsToEnqueue.push({
            name: `dispatch-${rec.phone}`,
            data: {
              recipientId: recId,
              campaignId,
              phone: rec.phone,
              messageType: message_type,
              renderedMessage: personalized,
              mediaId,
              mediaFilename
            }
          });
        }
      }

      await client.query('COMMIT');

      // Enqueue in BullMQ
      if (jobsToEnqueue.length > 0) {
        await campaignQueue.addBulk(jobsToEnqueue);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: campaignId,
          queuedJobs: jobsToEnqueue.length,
          skipped: recipients.length - jobsToEnqueue.length
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Campaign Creation Error]:', err);
      return res.status(500).json({ error: 'Failed to initialize campaign', details: err.message });
    } finally {
      client.release();
    }
  }

  async getAll(req, res) {
    try {
      const result = await db.query(`
        SELECT id, name, message_type, status, total_contacts, eligible_contacts, 
               submitted_count, delivered_count, read_count, failed_count, skipped_count, created_at 
        FROM campaigns 
        ORDER BY created_at DESC 
        LIMIT 50
      `);
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      return res.status(500).json({ error: 'Database read failure', details: err.message });
    }
  }
}

module.exports = new CampaignController();