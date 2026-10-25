-- Migration: 002_allow_rls_access.sql
-- Run this in Supabase Dashboard -> SQL Editor to allow the WhatsApp Bot to write
-- data using the Publishable / Anon Key without being blocked by Row Level Security (RLS).

ALTER TABLE whatsapp_auth_creds DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_auth_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
