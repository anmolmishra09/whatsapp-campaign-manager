const db = require('../config/database');

/**
 * Controller for Meta inbound webhooks, message statuses,
 * unsubscribe events, and WhatsApp template status updates.
 */
class WebhookController {
  /**
   * Handle webhook verification handshake from Meta App Dashboard.
   */
  verify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
      mode === 'subscribe' &&
      token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      console.log(
        '[Webhook Verification] Handshake validated successfully.'
      );

      return res.status(200).send(challenge);
    }

    return res
      .status(403)
      .json({ error: 'Verification token mismatch' });
  }

  /**
   * Process incoming Meta webhook events.
   */
  async handleEvent(req, res) {
    const { body } = req;

    // Acknowledge the webhook promptly to avoid unnecessary retries.
    res.status(200).send('EVENT_RECEIVED');

    if (body?.object !== 'whatsapp_business_account') {
      return;
    }

    try {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value;

          if (!value) {
            continue;
          }

          /*
           * 1. WhatsApp message delivery status updates
           * Handles sent, delivered, read, and failed statuses.
           */
          if (
            Array.isArray(value.statuses) &&
            value.statuses.length > 0
          ) {
            for (const statusObj of value.statuses) {
              const wamId = statusObj.id;
              const status = statusObj.status;

              const timestamp = statusObj.timestamp
                ? new Date(Number(statusObj.timestamp) * 1000)
                : new Date();

              if (!wamId || !status) {
                continue;
              }

              let updateQuery = '';
              const params = [wamId];

              if (status === 'sent') {
                updateQuery = `
                  UPDATE campaign_recipients
                  SET status = $2,
                      sent_at = $3
                  WHERE whatsapp_message_id = $1
                `;

                params.push('sent', timestamp);
              } else if (status === 'delivered') {
                updateQuery = `
                  UPDATE campaign_recipients
                  SET status = $2,
                      delivered_at = $3
                  WHERE whatsapp_message_id = $1
                    AND status <> 'read'
                `;

                params.push('delivered', timestamp);
              } else if (status === 'read') {
                updateQuery = `
                  UPDATE campaign_recipients
                  SET status = $2,
                      read_at = $3
                  WHERE whatsapp_message_id = $1
                `;

                params.push('read', timestamp);
              } else if (status === 'failed') {
                const failureDetails = statusObj.errors
                  ? JSON.stringify(statusObj.errors)
                  : 'Unknown Meta delivery failure';

                updateQuery = `
                  UPDATE campaign_recipients
                  SET status = $2,
                      failure_reason = $3
                  WHERE whatsapp_message_id = $1
                `;

                params.push('failed', failureDetails);
              }

              if (!updateQuery) {
                continue;
              }

              const recipientRes = await db.query(
                updateQuery,
                params
              );

              // Update campaign counters only if a recipient row matched.
              // Note: these increments are not idempotent by themselves.
              if (
                recipientRes.rowCount > 0 &&
                status === 'delivered'
              ) {
                await db.query(
                  `
                    UPDATE campaigns
                    SET delivered_count = delivered_count + 1
                    WHERE id = (
                      SELECT campaign_id
                      FROM campaign_recipients
                      WHERE whatsapp_message_id = $1
                    )
                  `,
                  [wamId]
                );
              } else if (
                recipientRes.rowCount > 0 &&
                status === 'read'
              ) {
                await db.query(
                  `
                    UPDATE campaigns
                    SET read_count = read_count + 1
                    WHERE id = (
                      SELECT campaign_id
                      FROM campaign_recipients
                      WHERE whatsapp_message_id = $1
                    )
                  `,
                  [wamId]
                );
              }
            }
          }

          /*
           * 2. WhatsApp message template status updates
           * Handles APPROVED, REJECTED, and PAUSED events.
           */
          const templateStatusEvents = [
            'APPROVED',
            'REJECTED',
            'PAUSED',
          ];

          if (
            templateStatusEvents.includes(value.event) &&
            value.message_template_id != null
          ) {
            const metaTemplateId = String(
              value.message_template_id
            );

            const newStatus = value.event;

            await db.query(
              `
                UPDATE message_templates
                SET status = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE meta_template_id = $2
              `,
              [newStatus, metaTemplateId]
            );

            console.log(
              `[Template Status Updated] Template ${
                value.message_template_name || metaTemplateId
              } is now ${newStatus}`
            );
          }

          /*
           * 3. Inbound STOP / unsubscribe keywords
           */
          if (
            Array.isArray(value.messages) &&
            value.messages.length > 0
          ) {
            for (const msg of value.messages) {
              if (
                msg.type !== 'text' ||
                !msg.text?.body ||
                !msg.from
              ) {
                continue;
              }

              const incomingText = msg.text.body
                .trim()
                .toUpperCase();

              const optOutKeywords = [
                'STOP',
                'UNSUBSCRIBE',
                'CANCEL',
                'HALT',
              ];

              if (optOutKeywords.includes(incomingText)) {
                const senderPhone = msg.from;

                await db.query(
                  `
                    INSERT INTO suppression_list (
                      phone_number,
                      reason,
                      source
                    )
                    VALUES (
                      $1,
                      'user_keyword_opt_out',
                      'inbound_whatsapp'
                    )
                    ON CONFLICT (phone_number) DO NOTHING
                  `,
                  [senderPhone]
                );

                console.log(
                  `[Suppression] Added ${senderPhone} to suppression list via keyword.`
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(
        '[Webhook Processing Error]:',
        err.response?.data || err.message || err
      );
    }
  }
}

module.exports = new WebhookController();
