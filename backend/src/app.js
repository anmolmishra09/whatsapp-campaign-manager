
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const campaignRoutes = require('./routes/campaign.routes');
const webhookRoutes = require('./routes/webhook.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// Security headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Add development origins if they are not already configured.
const developmentOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://172.21.32.1:8080',
];

if (process.env.NODE_ENV !== 'production') {
  developmentOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);

      return callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// Parse JSON while preserving the raw body for webhook HMAC checks.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/whatsapp/webhook', webhookRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(
    '[Unhandled Exception]:',
    err.stack || err.message
  );

  // Return a clear response for CORS errors.
  if (err.message === 'Blocked by CORS policy') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'This origin is not allowed to access the API.',
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'A processing error occurred.',
  });
});

module.exports = app;