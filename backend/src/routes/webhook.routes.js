const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const validateSignature = require('../middleware/webhookValidator.middleware');

// GET for Meta Challenge Handshake
router.get('/', (req, res) => webhookController.verify(req, res));

// POST for Real-time Statuses with HMAC verification
router.post('/', validateSignature, (req, res) => webhookController.handleEvent(req, res));

module.exports = router;