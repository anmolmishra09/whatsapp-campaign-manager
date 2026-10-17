
/**
 * Centralized API Integration Client
 */
const API = {
  BASE_URL: 'http://localhost:4000/api',

  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Request failed with code ${response.status}`
        );
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  getSenderStatus() {
    return this.request('/settings/whatsapp/status');
  },

  verifySettings(payload) {
    return this.request('/settings/whatsapp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  sendTestMessage(recipient, message) {
    return this.request('/settings/whatsapp/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, message })
    });
  },

  createCampaign(formData) {
    return this.request('/campaigns', {
      method: 'POST',
      body: formData // multipart/form-data via fetch native
    });
  },

  getCampaignHistory() {
    return this.request('/campaigns');
  },

  getSuppressions() {
    return this.request('/contacts/suppressions');
  },

  addSuppression(phone_number) {
    return this.request('/contacts/suppressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number })
    });
  }
};

window.API = API;
