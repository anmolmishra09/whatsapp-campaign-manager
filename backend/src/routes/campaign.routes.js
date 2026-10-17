
const express = require('express');
const router = express.Router();

const campaignController = require('../controllers/campaign.controller');
const upload = require('../middleware/upload.middleware');

// Create campaign, optionally with a media file.
router.post(
  '/',
  upload.single('media_file'),
  (req, res) => campaignController.create(req, res)
);

// Get all campaigns.
router.get(
  '/',
  (req, res) => campaignController.getAll(req, res)
);

module.exports = router;
