/**
 * Settings & Verification Controller
 * Handles Meta Cloud API credentials registration and direct live test dispatches.
 */
class SettingsManager {
  constructor() {
    this.phoneInput = document.getElementById('settingPhoneNumber');
    this.phoneIdInput = document.getElementById('settingPhoneId');
    this.wabaIdInput = document.getElementById('settingWabaId');
    this.saveBtn = document.getElementById('saveSettingsBtn');
    this.checkStatusBtn = document.getElementById('testApiConnectivityBtn');

    // Test dispatch elements
    this.testPhoneInput = document.getElementById('testRecipientPhone');
    this.testBodyInput = document.getElementById('testMessageBody');
    this.sendTestBtn = document.getElementById('sendTestMessageBtn');
    this.responseBox = document.getElementById('testResponseBox');

    this.init();
  }

  init() {
    this.saveBtn.addEventListener('click', () => this.handleSaveProfile());
    this.checkStatusBtn.addEventListener('click', () => this.handleCheckStatus());
    this.sendTestBtn.addEventListener('click', () => this.handleSendTest());

    // Pre-populate status on load
    this.handleCheckStatus(true);
  }

  logResponse(title, data, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    this.responseBox.style.color = isError ? '#f87171' : '#38bdf8';
    this.responseBox.innerText = `[${timestamp}] ${title}\n${formattedData}`;
  }

  async handleCheckStatus(silent = false) {
    if (!silent) {
      this.checkStatusBtn.disabled = true;
      this.checkStatusBtn.innerText = 'Querying Meta...';
    }

    try {
      const res = await API.getSenderStatus();
      if (res.success && res.data.status === 'verified') {
        if (!silent) this.logResponse('Meta Graph API: ONLINE & VERIFIED', res.data);
        if (res.data.phone_number_id && !this.phoneIdInput.value) {
          this.phoneIdInput.value = res.data.phone_number_id;
        }
      } else {
        if (!silent) this.logResponse('Meta Graph API: UNVERIFIED / ERROR', res.data, true);
      }
    } catch (err) {
      if (!silent) this.logResponse('Meta Graph API Status Check Failed', err.message, true);
    } finally {
      if (!silent) {
        this.checkStatusBtn.disabled = false;
        this.checkStatusBtn.innerText = 'Check Graph API Status';
      }
    }
  }

  async handleSaveProfile() {
    const phone_number = this.phoneInput.value.trim();
    const phone_number_id = this.phoneIdInput.value.trim();
    const waba_id = this.wabaIdInput.value.trim();

    if (!phone_number_id || !waba_id) {
      alert('Validation Error: Phone Number ID and WABA ID are required.');
      return;
    }

    this.saveBtn.disabled = true;
    this.saveBtn.innerText = 'Saving...';

    try {
      const res = await API.verifySettings({ phone_number, phone_number_id, waba_id });
      this.logResponse('Profile Persistence Result', res);
      alert('Settings stored successfully.');
    } catch (err) {
      this.logResponse('Profile Save Failed', err.message, true);
      alert(`Save error: ${err.message}`);
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.innerText = 'Save & Register Profile';
    }
  }

  async handleSendTest() {
    let recipient = this.testPhoneInput.value.trim().replace(/[^\d]/g, '');
    const message = this.testBodyInput.value.trim() || 'Direct test ping from WhatsApp Campaign Manager.';

    if (!recipient || recipient.length < 10) {
      alert('Please enter a valid international phone number (e.g., 918787222966).');
      return;
    }

    this.sendTestBtn.disabled = true;
    this.sendTestBtn.innerText = 'Transmitting to Meta Cloud...';
    this.responseBox.style.color = '#fbbf24';
    this.responseBox.innerText = `Dispatching payload to +${recipient}...`;

    try {
      const response = await API.sendTestMessage(recipient, message);
      this.logResponse('SUCCESS: Meta Graph API Accepted Message', response);
    } catch (err) {
      this.logResponse('ERROR: Meta Cloud API Dispatch Failed', err.message, true);
    } finally {
      this.sendTestBtn.disabled = false;
      this.sendTestBtn.innerText = 'Send Test WhatsApp';
    }
  }
}

// Instantiate when DOM is fully mounted
document.addEventListener('DOMContentLoaded', () => {
  window.settingsManager = new SettingsManager();
});