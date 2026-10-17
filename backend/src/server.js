const app = require('./app');
require('./jobs/campaign.worker'); // Initialize background worker
const db = require('./config/database');

const PORT = process.env.PORT || 4000;

// Test DB Connectivity on bootstrap
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Bootstrap Error] Database connection failed:', err);
    process.exit(1);
  }
  console.log('[PostgreSQL] Database connection verified at:', res.rows[0].now);

  app.listen(PORT, () => {
    console.log(`[HTTP Server] Operational on http://localhost:${PORT}`);
  });
});