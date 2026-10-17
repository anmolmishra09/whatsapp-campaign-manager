-- 001_initial_schema.sql
-- WhatsApp Bulk Campaign Manager
-- PostgreSQL initial database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. USERS AND ADMINS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. SUPPRESSION LIST
-- Stores contacts who have opted out of messaging.
-- =========================================================

CREATE TABLE IF NOT EXISTS suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    reason VARCHAR(100) DEFAULT 'user_opt_out',
    source VARCHAR(50) DEFAULT 'incoming_keyword',
    suppressed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppression_phone
    ON suppression_list(phone_number);

-- =========================================================
-- 3. WHATSAPP SENDER PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS sender_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    phone_number_id VARCHAR(100) UNIQUE NOT NULL,
    waba_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'unverified',
    quality_rating VARCHAR(30) DEFAULT 'UNKNOWN',
    messaging_limit_tier VARCHAR(50) DEFAULT 'TIER_50',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. CAMPAIGNS
-- =========================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    sender_id UUID REFERENCES sender_profiles(id)
        ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,

    message_type VARCHAR(50) NOT NULL,
    -- text_only, pdf_only, text_with_pdf, template

    raw_message TEXT,

    template_name VARCHAR(100),
    template_language VARCHAR(10) DEFAULT 'en_US',

    media_url VARCHAR(1024),
    media_whatsapp_id VARCHAR(255),
    media_filename VARCHAR(255),

    status VARCHAR(50) DEFAULT 'draft',
    -- draft, scheduled, running, paused, completed,
    -- cancelled, failed

    total_contacts INTEGER DEFAULT 0,
    eligible_contacts INTEGER DEFAULT 0,
    submitted_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
    ON campaigns(status);

-- =========================================================
-- 5. CAMPAIGN RECIPIENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    campaign_id UUID NOT NULL
        REFERENCES campaigns(id) ON DELETE CASCADE,

    phone_number VARCHAR(30) NOT NULL,
    contact_name VARCHAR(255),

    personalization_data JSONB DEFAULT '{}'::jsonb,

    whatsapp_message_id VARCHAR(255) UNIQUE,

    status VARCHAR(50) DEFAULT 'pending',
    -- pending, queued, submitted, sent, delivered,
    -- read, failed, skipped

    failure_code VARCHAR(100),
    failure_reason TEXT,

    retry_count INTEGER DEFAULT 0,

    submitted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id
    ON campaign_recipients(campaign_id);

CREATE INDEX IF NOT EXISTS idx_recipients_wam_id
    ON campaign_recipients(whatsapp_message_id);

CREATE INDEX IF NOT EXISTS idx_recipients_phone
    ON campaign_recipients(phone_number);

CREATE INDEX IF NOT EXISTS idx_recipients_status
    ON campaign_recipients(status);

-- =========================================================
-- 6. WHATSAPP MESSAGE TEMPLATES
-- Stores Meta template IDs, components, and approval status.
-- =========================================================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    meta_template_id VARCHAR(100) UNIQUE NOT NULL,

    waba_id VARCHAR(100) NOT NULL,

    name VARCHAR(255) NOT NULL,

    language VARCHAR(10) NOT NULL,

    category VARCHAR(50) NOT NULL,
    -- MARKETING, UTILITY, AUTHENTICATION

    status VARCHAR(50) NOT NULL,
    -- APPROVED, REJECTED, PENDING, PAUSED, DISABLED

    components JSONB NOT NULL,
    -- Meta template components: HEADER, BODY, FOOTER, BUTTONS

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_template_name_language_waba
        UNIQUE (name, language, waba_id)
);

CREATE INDEX IF NOT EXISTS idx_templates_waba_status
    ON message_templates(waba_id, status);

-- =========================================================
-- 7. AUDIT LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,

    entity_id VARCHAR(100),

    details JSONB,

    ip_address VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- END OF INITIAL SCHEMA
-- =========================================================
