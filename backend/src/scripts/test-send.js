// backend/src/scripts/test-send.js
require('dotenv').config();
const whatsappService = require('../services/whatsapp.service');

async function runTest() {
  // Use recipient number with international country code (e.g., 918787222966)
  const recipient = process.env.TEST_RECIPIENT || '918787222966';
  
  console.log(`[Test Dispatch] Target Recipient: +${recipient}`);
  console.log(`[Test Dispatch] Using Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);

  try {
    const response = await whatsappService.sendTextMessage(
      recipient, 
      '🚀 Enterprise WhatsApp Manager: Meta Cloud API connection verified successfully!'
    );

    console.log('\n✅ [Meta API Accepted]');
    console.log('Status: HTTP 200 OK');
    console.log('Message ID (WAMID):', response.messages[0].id);
  } catch (error) {
    console.error('\n❌ [Meta API Rejected]');
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network / Config Error:', error.message);
    }
  }
}

runTest();