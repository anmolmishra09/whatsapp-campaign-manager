// backend/src/services/templateSync.service.js
const axios = require('axios');
const db = require('../config/database');

class TemplateSyncService {
  constructor() {
    this.baseUrl = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com';
    this.version = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.token = process.env.WHATSAPP_ACCESS_TOKEN;
    this.wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  async syncAllTemplates() {
    if (!this.wabaId || !this.token) {
      throw new Error('Missing WABA_ID or WHATSAPP_ACCESS_TOKEN configuration.');
    }

    let url = `${this.baseUrl}/${this.version}/${this.wabaId}/message_templates?limit=100`;
    const fetchedIds = [];

    try {
      while (url) {
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${this.token}` }
        });

        const { data, paging } = response.data;

        for (const tpl of data) {
          fetchedIds.push(tpl.id);

          await db.query(`
            INSERT INTO message_templates (
              meta_template_id, waba_id, name, language, category, status, components, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (meta_template_id)
            DO UPDATE SET
              category = EXCLUDED.category,
              status = EXCLUDED.status,
              components = EXCLUDED.components,
              updated_at = CURRENT_TIMESTAMP
          `, [
            tpl.id,
            this.wabaId,
            tpl.name,
            tpl.language,
            tpl.category,
            tpl.status,
            JSON.stringify(tpl.components)
          ]);
        }

        // Handle Graph API cursor pagination
        url = (paging && paging.next) ? paging.next : null;
      }

      // Mark removed templates locally if not returned by Meta
      if (fetchedIds.length > 0) {
        await db.query(`
          UPDATE message_templates
          SET status = 'DISABLED', updated_at = CURRENT_TIMESTAMP
          WHERE waba_id = $1 AND meta_template_id != ALL($2::varchar[])
        `, [this.wabaId, fetchedIds]);
      }

      return { success: true, count: fetchedIds.length };
    } catch (err) {
      console.error('[Template Sync Failed]:', err.response?.data || err.message);
      throw err;
    }
  }
}

module.exports = new TemplateSyncService();