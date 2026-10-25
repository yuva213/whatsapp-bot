-- WhatsApp Bot Schema for Baileys & Supabase Integration
-- Migration: 001_whatsapp_bot_init.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Authentication Credentials Table
CREATE TABLE IF NOT EXISTS whatsapp_auth_creds (
    session_id TEXT PRIMARY KEY,
    creds JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Signal Protocol Keys Table
CREATE TABLE IF NOT EXISTS whatsapp_auth_keys (
    session_id TEXT NOT NULL,
    key_type TEXT NOT NULL,
    key_id TEXT NOT NULL,
    key_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, key_type, key_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_auth_keys_lookup 
ON whatsapp_auth_keys(session_id, key_type);

-- 3. WhatsApp Contacts Table
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id TEXT PRIMARY KEY, -- JID (e.g. 1234567890@s.whatsapp.net)
    phone_number TEXT,
    name TEXT,
    notify_name TEXT,
    verified_name TEXT,
    profile_pic_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone 
ON whatsapp_contacts(phone_number);

-- 4. WhatsApp Chats Table
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id TEXT PRIMARY KEY, -- JID (user or group JID)
    name TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    unread_count INT DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT NOT NULL, -- WhatsApp Message ID
    chat_id TEXT NOT NULL, -- remoteJid
    sender_id TEXT, -- participant or remoteJid
    from_me BOOLEAN DEFAULT FALSE,
    push_name TEXT,
    message_type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    status TEXT DEFAULT 'received', -- received, sent, delivered, read
    raw_payload JSONB,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat 
ON whatsapp_messages(chat_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender 
ON whatsapp_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status 
ON whatsapp_messages(status);

-- 6. Helper Trigger to Auto-update updated_at Timestamp
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_whatsapp_auth_creds_updated_at ON whatsapp_auth_creds;
CREATE TRIGGER tr_whatsapp_auth_creds_updated_at
BEFORE UPDATE ON whatsapp_auth_creds
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS tr_whatsapp_auth_keys_updated_at ON whatsapp_auth_keys;
CREATE TRIGGER tr_whatsapp_auth_keys_updated_at
BEFORE UPDATE ON whatsapp_auth_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS tr_whatsapp_contacts_updated_at ON whatsapp_contacts;
CREATE TRIGGER tr_whatsapp_contacts_updated_at
BEFORE UPDATE ON whatsapp_contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS tr_whatsapp_chats_updated_at ON whatsapp_chats;
CREATE TRIGGER tr_whatsapp_chats_updated_at
BEFORE UPDATE ON whatsapp_chats
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
