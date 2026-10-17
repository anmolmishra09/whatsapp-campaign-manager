WhatsApp Campaign Manager
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue.svg) ![Redis](https://img.shields.io/badge/Redis-7%2B-red.svg) ![BullMQ](https://img.shields.io/badge/BullMQ-Queue-orange.svg) ![Meta WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp_Cloud_API-Meta-25D366.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A scalable, self-hosted WhatsApp campaign management system built with Node.js, Express.js, PostgreSQL, Redis, BullMQ, and the Meta WhatsApp Cloud API.

The platform is designed to manage bulk messaging campaigns, process recipient lists, schedule background jobs, handle media attachments, and track message delivery statuses through secure webhooks.

Table of Contents
Features
Technology Stack
System Architecture
Project Structure
Prerequisites
Installation and Setup
Environment Configuration
Database Setup
Running the Application
WhatsApp Webhook Configuration
Security Best Practices
Testing
Troubleshooting
License
Features
Campaign Management: Create and manage WhatsApp messaging campaigns.
Bulk Recipient Import: Import recipient lists using CSV and Excel files.
Phone Number Validation: Normalize and validate phone numbers in E.164 format.
Background Job Processing: Use BullMQ and Redis to process campaigns asynchronously.
Rate Pacing: Control message dispatch rates to help comply with applicable WhatsApp API limits.
Message Templates: Support approved WhatsApp message templates and eligible free-form messaging.
Media Handling: Upload and send supported documents, PDFs, and other supported media.
Delivery Tracking: Track message lifecycle events, including sent, delivered, read, and failed statuses.
Secure Webhooks: Verify Meta webhook signatures using HMAC-SHA256.
Persistent Storage: Store campaign and recipient data in PostgreSQL.
Responsive Frontend: Lightweight user interface built with HTML, CSS, and vanilla JavaScript.
Resilient Processing: Configure job retries, backoff strategies, and failure handling.
Important: WhatsApp messaging is subject to Meta's current policies, template requirements, messaging limits, and recipient consent requirements. Rate pacing does not guarantee compliance or prevent account restrictions.
Technology Stack

Technology	Purpose
Node.js 18+	JavaScript runtime
Express.js	Backend REST API
PostgreSQL 15+	Relational database
Redis 7+	Queue infrastructure
BullMQ	Background jobs and retries
Meta WhatsApp Cloud API	WhatsApp messaging
HTML5 and CSS3	Frontend structure and styling
Vanilla JavaScript (ES6+)	Frontend functionality
SheetJS	CSV and Excel file processing
Docker Compose	Local infrastructure
Multer	File upload handling
System Architecture
The application separates the frontend, API, database, queue, and messaging worker to support maintainable and asynchronous campaign processing.


                 +-------------------------+
                 |     Browser Client      |
                 | HTML, CSS, Vanilla JS   |
                 +------------+------------+
                              |
                         HTTPS / REST
                              |
                 +------------v------------+
                 |      Express API        |
                 | Authentication,         |
                 | Validation, Security    |
                 +------+------------+-----+
                        |            |
             +----------v--+    +----v-----------+
             | PostgreSQL  |    | Redis + BullMQ |
             | Campaigns   |    | Background     |
             | Recipients  |    | Job Queue      |
             +-------------+    +----+-----------+
                                     |
                                Worker Process
                                     |
                           +---------v----------+
                           | WhatsApp Cloud API |
                           | Meta Graph API     |
                           +---------+----------+
                                     |
                                Message Events
                                     |
                           +---------v----------+
                           | Webhook Endpoint   |
                           | Signature Verify   |
                           +---------+----------+
                                     |
                              Update Statuses
                                     |
                                PostgreSQL
Message Processing Flow
The user creates a campaign and imports recipient data.
The backend validates the request and normalizes phone numbers.
Campaign and recipient records are persisted in PostgreSQL.
Message jobs are added to BullMQ through Redis.
Workers process queued jobs according to configured concurrency and rate limits.
The worker sends eligible messages through the Meta WhatsApp Cloud API.
Meta sends webhook events to the configured callback endpoint.
The backend verifies webhook signatures and updates message statuses.
Project Structure

whatsapp-campaign-manager/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   └── meta.js
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── campaign.js
│
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
Note: The file names under config/, frontend/css/, and frontend/js/ are illustrative. Keep the names aligned with the files that actually exist in your repository.

Prerequisites
Ensure the following tools and accounts are available:

Node.js 18 or later
npm
PostgreSQL 15 or later
Redis 7 or later
Docker and Docker Compose
A Meta developer account with a configured WhatsApp Cloud API application
A WhatsApp business phone number configured for the Cloud API
Verify your installed versions:


node --version
npm --version
psql --version
redis-cli --version
docker --version
Installation and Setup
1. Clone the Repository

git clone <your-repository-url>
cd whatsapp-campaign-manager
Replace <your-repository-url> with your actual Git repository URL.

2. Configure Environment Variables
Create a local environment file from the example:


cp backend/.env.example backend/.env
Update backend/.env with your database credentials, Redis configuration, application secret, and Meta API credentials.

See Environment Configuration for details.

3. Start PostgreSQL and Redis
Start the infrastructure services defined in docker-compose.yml:


docker compose up -d
Check their status:


docker compose ps
Ensure the database and Redis connection settings match the services configured in Docker Compose.

4. Install Backend Dependencies

cd backend
npm install
5. Initialize the Database
From the repository root, execute the initial migration:


psql -h localhost \
  -U postgres \
  -d wa_campaign_db \
  -f database/migrations/001_initial_schema.sql
Update the hostname, database name, username, and password as needed for your environment.

The database must exist before applying the migration. Create it first if your Docker Compose configuration does not create it automatically.

6. Start the Backend
From the backend/ directory:


npm run dev
For production, use the production start script defined in backend/package.json, if available.

7. Start the Frontend
From the repository root, open the frontend through a static development server:


npx serve frontend
Open the local URL printed by the server in your browser.

If the frontend and backend use different origins, configure the backend's CORS policy and the frontend API base URL accordingly.

Environment Configuration
Example backend/.env:


# Application
PORT=5000
NODE_ENV=development
APP_SECRET=replace_with_a_long_random_secret

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wa_campaign_db

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Meta WhatsApp Cloud API
META_WA_PHONE_NUMBER_ID=your_phone_number_id
META_WA_BUSINESS_ACCOUNT_ID=your_waba_id
META_WA_ACCESS_TOKEN=your_access_token
META_WA_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
META_WA_APP_SECRET=your_meta_app_secret
META_GRAPH_VERSION=v21.0
Environment Variable Reference

Variable	Description
PORT	Port used by the Express server
NODE_ENV	Application environment
APP_SECRET	Secret used by the application's configured authentication or session mechanisms
DATABASE_URL	PostgreSQL connection string
REDIS_HOST	Redis server hostname
REDIS_PORT	Redis server port
META_WA_PHONE_NUMBER_ID	WhatsApp Cloud API phone number ID
META_WA_BUSINESS_ACCOUNT_ID	WhatsApp Business Account ID
META_WA_ACCESS_TOKEN	Access token authorized to call the WhatsApp Cloud API
META_WA_WEBHOOK_VERIFY_TOKEN	Custom token used during webhook subscription verification
META_WA_APP_SECRET	Meta application secret used to verify webhook signatures
META_GRAPH_VERSION	Supported Meta Graph API version configured for the application
Use a currently supported Graph API version and verify compatibility before upgrading.

Security note: Never commit .env files, access tokens, application secrets, or database passwords to source control. Keep .env.example limited to placeholder values.

Database Setup
The baseline migration is located at:


database/migrations/001_initial_schema.sql
Apply the migration:


psql "$DATABASE_URL" \
  -f database/migrations/001_initial_schema.sql
This command assumes the DATABASE_URL environment variable is available in your shell. Otherwise, use the explicit connection parameters from the installation instructions.

Confirm that the migration completed successfully before starting campaign processing.

Running the Application
Development
Terminal 1 — Start infrastructure:


docker compose up -d
Terminal 2 — Start the backend:


cd backend
npm run dev
Terminal 3 — Serve the frontend:


npx serve frontend
Production Deployment
For production environments:

Use HTTPS for the frontend, REST API, and public webhook endpoint.
Use a process manager or container orchestration platform.
Configure persistent PostgreSQL and Redis storage.
Keep secrets in an environment-specific secret manager.
Configure logging, monitoring, and alerting.
Restrict database and Redis network access.
Configure worker concurrency and message pacing according to current Meta limits.
Implement graceful shutdown and queue recovery procedures.
Configure backups and test restoration procedures.
Production deployment commands depend on the scripts and infrastructure defined by the project.

WhatsApp Webhook Configuration
The webhook receives message status events from Meta and allows the application to update campaign delivery information.

1. Configure a Public HTTPS Endpoint
Set the callback URL in the Meta Developer Dashboard:


https://your-domain.com/api/v1/whatsapp/webhook
Replace your-domain.com with your publicly accessible application domain.

For local development, expose your local server through a secure tunneling service.

2. Configure the Verification Token
Set the same custom token in both locations:

META_WA_WEBHOOK_VERIFY_TOKEN in backend/.env
The webhook verification token in the Meta Developer Dashboard
3. Subscribe to Webhook Events
Enable the WhatsApp messages webhook field to receive supported message status and inbound message events.

4. Verify Webhook Signatures
Validate incoming webhook POST requests using the X-Hub-Signature-256 header and the Meta application secret.

Signature verification should use the original raw request body and a timing-safe comparison before the application processes the event.

5. Update Message Statuses
Process supported webhook events and update the corresponding message records in PostgreSQL. Webhook handling should be idempotent because events can be retried or received more than once.

Security Best Practices
Authentication: Protect campaign management endpoints with appropriate authentication and authorization.
CSRF Protection: Apply CSRF controls where required by the chosen cookie-based authentication strategy.
Rate Limiting: Limit API requests, login attempts, and file uploads.
Input Validation: Validate campaign payloads, recipient lists, uploaded files, and template parameters.
Phone Number Validation: Normalize phone numbers and reject invalid inputs before enqueueing jobs.
Webhook Verification: Verify Meta webhook signatures against the raw request body.
File Storage: Store uploaded files outside publicly accessible directories and validate their types and sizes.
Secret Management: Store API tokens and application secrets securely and rotate them when necessary.
Queue Reliability: Configure retries, backoff, failure handling, and idempotency to prevent duplicate sends.
Recipient Consent: Send messages only to recipients who have provided the required consent and comply with applicable opt-out requirements.
API Compliance: Follow Meta's current WhatsApp Business Messaging policies, template rules, and messaging limits.
Testing
Run the backend test suite from the backend/ directory:


npm test
The test suite should cover the functionality implemented in the repository, including:

Phone number normalization and validation
API request validation
Database integration
Queue processing and retry behavior
Webhook signature verification
Message status processing
Campaign error handling
The exact test coverage depends on the test files included in the project.

Troubleshooting
Database Connection Failed
Confirm that PostgreSQL is running.
Verify the DATABASE_URL value.
Ensure that the database exists and the migration has been applied.
Check that the configured database user has the required permissions.
Redis Connection Failed
Confirm that Redis is running.
Verify REDIS_HOST and REDIS_PORT.
Check the Redis logs and network connectivity.
WhatsApp API Requests Fail
Verify the access token and phone number ID.
Confirm that the token has the required permissions and has not expired.
Check the Meta API response for error details.
Verify the configured Graph API version and WhatsApp account status.
Webhook Verification Fails
Confirm that the callback URL is publicly reachable over HTTPS.
Check that the verification token matches the configured value.
Ensure POST signature verification uses the unmodified raw request body.
Confirm that the Meta application secret is configured correctly.
Campaign Jobs Remain Pending
Verify that Redis is reachable.
Ensure the BullMQ worker is running.
Inspect failed jobs and worker logs.
Check configured concurrency, retry policies, and rate limits.
License
This project is licensed under the MIT License. See the LICENSE file for details.

Contributing
Contributions, bug reports, and feature requests are welcome.

Fork the repository.
Create a feature branch.
Implement and test your changes.
Submit a pull request with a clear description of the changes.