const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const db = require('../config/database');
const whatsappService = require('../services/whatsapp.service');
require('dotenv').config();

const worker = new Worker('whatsapp-campaigns', async (job) => {
  const { recipientId, campaignId, phone, messageType, renderedMessage, mediaId, mediaFilename } = job.data;

  // 1. Double check suppression list before dispatch
  const suppressionCheck = await db.query(
    'SELECT id FROM suppression_list WHERE phone_number = $1',
    [phone]
  );

  if (suppressionCheck.rows.length > 0) {
    await db.query(
      `UPDATE campaign_recipients 
       SET status = 'skipped', failure_reason = 'Opted out - suppression list active' 
       WHERE id = $1`,
      [recipientId]
    );
    await db.query('UPDATE campaigns SET skipped_count = skipped_count + 1 WHERE id = $1', [campaignId]);
    return { status: 'skipped', reason: 'suppressed' };
  }

  // 2. Transmit through WhatsApp Cloud API
  let apiResponse;
  try {
    if (messageType === 'text_only') {
      apiResponse = await whatsappService.sendTextMessage(phone, renderedMessage);
    } else if (messageType === 'pdf_only') {
      apiResponse = await whatsappService.sendDocumentMessage(phone, mediaId, mediaFilename);
    } else if (messageType === 'text_with_pdf') {
      apiResponse = await whatsappService.sendDocumentMessage(phone, mediaId, mediaFilename, renderedMessage);
    } else {
      throw new Error(`Unsupported message format: ${messageType}`);
    }

    const wamId = apiResponse.messages[0].id;

    // 3. Mark recipient as submitted (API accepted)
    await db.query(
      `UPDATE campaign_recipients 
       SET status = 'submitted', whatsapp_message_id = $1, submitted_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [wamId, recipientId]
    );

    await db.query('UPDATE campaigns SET submitted_count = submitted_count + 1 WHERE id = $1', [campaignId]);

    return { status: 'submitted', wamId };
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    await db.query(
      `UPDATE campaign_recipients 
       SET status = 'failed', failure_reason = $1 
       WHERE id = $2`,
      [errorMsg, recipientId]
    );
    await db.query('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1', [campaignId]);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  limiter: {
    max: parseInt(process.env.QUEUE_RATE_MAX || '40', 10),
    duration: parseInt(process.env.QUEUE_RATE_DURATION_MS || '1000', 10)
  }
});

worker.on('completed', (job) => {
  console.log(`[Queue Worker] Job ${job.id} executed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue Worker] Job ${job.id} failed:`, err.message);
});

module.exports = worker;