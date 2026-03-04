-- =============================================
-- AlphaBN WiFi Billing System - Database Schema
-- Run this SQL in your Supabase SQL Editor
-- Project: https://enlqpifpxuecxxozyiak.supabase.co
-- =============================================

-- 1. WiFi Packages Table
CREATE TABLE IF NOT EXISTS wifi_packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  duration_label TEXT NOT NULL DEFAULT '1 HOUR',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  speed_limit TEXT DEFAULT NULL,
  data_limit TEXT DEFAULT NULL,
  mikrotik_profile TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default packages
INSERT INTO wifi_packages (name, duration_hours, duration_label, price, mikrotik_profile, sort_order) VALUES
  ('3 HOURS UNLIMITED', 3, '3 HOURS', 10, 'wifi-3h', 1),
  ('12 HOURS UNLIMITED', 12, '12 HOURS', 20, 'wifi-12h', 2),
  ('24 HOURS UNLIMITED', 24, '24 HOURS', 30, 'wifi-24h', 3),
  ('2 DAYS UNLIMITED', 48, '2 DAYS', 50, 'wifi-2d', 4),
  ('1 WEEK UNLIMITED', 168, '1 WEEK', 150, 'wifi-1w', 5),
  ('1 MONTH UNLIMITED', 720, '1 MONTH', 600, 'wifi-1m', 6);

-- 2. WiFi Payments Table
CREATE TABLE IF NOT EXISTS wifi_payments (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  package_id BIGINT REFERENCES wifi_packages(id),
  package_name TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT 'jenga_mobile',
  payment_reference TEXT,
  jenga_reference TEXT,
  jenga_checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  mac_address TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. WiFi Vouchers Table
CREATE TABLE IF NOT EXISTS wifi_vouchers (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  package_id BIGINT REFERENCES wifi_packages(id),
  package_name TEXT NOT NULL DEFAULT '',
  payment_id BIGINT REFERENCES wifi_payments(id),
  duration_hours INTEGER NOT NULL DEFAULT 24,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'system'
);

-- 4. WiFi Sessions Table
CREATE TABLE IF NOT EXISTS wifi_sessions (
  id BIGSERIAL PRIMARY KEY,
  voucher_id BIGINT REFERENCES wifi_vouchers(id),
  voucher_code TEXT,
  username TEXT NOT NULL,
  mac_address TEXT,
  ip_address TEXT,
  package_name TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected')),
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0
);

-- 5. WiFi Settings Table
CREATE TABLE IF NOT EXISTS wifi_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general'
);

-- Insert default settings
INSERT INTO wifi_settings (key, value, category) VALUES
  ('business_name', 'AlphaBN', 'business'),
  ('business_phone', '0720316175', 'business'),
  ('business_tagline', 'High Speed Internet', 'business'),
  ('mikrotik_host', '192.168.88.1', 'mikrotik'),
  ('mikrotik_port', '443', 'mikrotik'),
  ('mikrotik_username', 'admin', 'mikrotik'),
  ('mikrotik_use_ssl', 'true', 'mikrotik')
ON CONFLICT (key) DO NOTHING;

-- 6. WiFi Admins Table
CREATE TABLE IF NOT EXISTS wifi_admins (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO wifi_admins (username, password, name) VALUES
  ('admin', 'admin123', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- INDEXES for better query performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_wifi_payments_status ON wifi_payments(status);
CREATE INDEX IF NOT EXISTS idx_wifi_payments_phone ON wifi_payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_wifi_payments_created ON wifi_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wifi_vouchers_code ON wifi_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_wifi_vouchers_status ON wifi_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_wifi_sessions_status ON wifi_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wifi_sessions_username ON wifi_sessions(username);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Disable for now - enable when you need fine-grained access control
-- =============================================
ALTER TABLE wifi_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_admins ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (anon key)
CREATE POLICY "Allow all wifi_packages" ON wifi_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wifi_payments" ON wifi_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wifi_vouchers" ON wifi_vouchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wifi_sessions" ON wifi_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wifi_settings" ON wifi_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wifi_admins" ON wifi_admins FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Done! Your WiFi billing database is ready.
-- =============================================
