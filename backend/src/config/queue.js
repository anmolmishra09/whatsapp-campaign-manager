const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || 'redis_secure_pass_2026',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error in queue configuration:', err);
});

// Primary campaign worker queue
const campaignQueue = new Queue('whatsapp-campaigns', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

module.exports = {
  campaignQueue,
  redisConnection
};