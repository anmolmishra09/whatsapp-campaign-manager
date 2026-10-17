const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

class WhatsAppService {
  constructor() {
    this.baseUrl =
      process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com';

    this.version = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.token = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify sender configuration against Meta Graph API
   */
  async verifySenderProfile() {
    if (!this.token || !this.phoneNumberId) {
      throw new Error(
        'API Credentials Incomplete: Ensure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are defined.'
      );
    }

    const url = `${this.baseUrl}/${this.version}/${this.phoneNumberId}`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
    });

    return response.data;
  }

  /**
   * Upload local PDF or other supported media to WhatsApp
   */
  async uploadMedia(filePath, mimeType = 'application/pdf') {
    if (!this.token || !this.phoneNumberId) {
      throw new Error('WhatsApp API credentials are missing.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const url = `${this.baseUrl}/${this.version}/${this.phoneNumberId}/media`;

    const form = new FormData();

    form.append('messaging_product', 'whatsapp');
    form.append('file', fs.createReadStream(filePath), {
      contentType: mimeType,
    });
    form.append('type', mimeType);

    const response = await axios.post(url, form, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...form.getHeaders(),
      },
    });

    return response.data.id;
  }

  /**
   * Send WhatsApp freeform text message
   * Normally permitted within the 24-hour customer service window.
   */
  async sendTextMessage(to, body) {
    const url = `${this.baseUrl}/${this.version}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to),
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    };

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    return response.data;
  }

  /**
   * Send WhatsApp document (PDF) by media ID or public URL
   */
  async sendDocumentMessage(to, mediaIdOrUrl, filename, caption = '') {
    const url = `${this.baseUrl}/${this.version}/${this.phoneNumberId}/messages`;

    const documentObj = {
      filename,
    };

    if (/^https?:\/\//i.test(mediaIdOrUrl)) {
      documentObj.link = mediaIdOrUrl;
    } else {
      documentObj.id = mediaIdOrUrl;
    }

    if (caption) {
      documentObj.caption = caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to),
      type: 'document',
      document: documentObj,
    };

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    return response.data;
  }

  /**
   * Send a pre-approved template message.
   * Use for business-initiated messages outside the
   * 24-hour customer service window.
   *
   * @param {string} to Recipient phone number in international format
   * @param {string} templateName Approved WhatsApp template name
   * @param {string} languageCode Template language code, e.g. "en_US"
   * @param {Array} components Optional template components and parameters
   */
  async sendTemplateMessage(
    to,
    templateName,
    languageCode,
    components = []
  ) {
    const url = `${this.baseUrl}/${this.version}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: String(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    };

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    return response.data;
  }
}

module.exports = new WhatsAppService();