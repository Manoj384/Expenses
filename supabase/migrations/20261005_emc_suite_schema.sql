-- ============================================================================
-- AUTOMOTIVE ELECTROMAGNETIC COMPATIBILITY (EMC) DATABASE SCHEMA
-- Version 1.0 - Production Ready for ISO 11452, CISPR 25, and Document Storage
-- ============================================================================

-- 1. Master Standards Table (ISO 11452 series, CISPR 25, ISO 7637, OEM specs)
CREATE TABLE IF NOT EXISTS emc_standards (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'iso-11452-2', 'cispr-25-ce'
  category VARCHAR(32) NOT NULL, -- 'immunity' | 'emissions' | 'transients'
  standard_code VARCHAR(64) NOT NULL, -- 'ISO 11452-2:2019'
  title TEXT NOT NULL,
  frequency_range TEXT NOT NULL,
  min_freq_mhz NUMERIC,
  max_freq_mhz NUMERIC,
  test_type VARCHAR(64), -- 'Radiated Immunity', 'Conducted Emissions'
  summary TEXT,
  setup_rules JSONB DEFAULT '[]'::jsonb,
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Test Setups & Chamber Geometries Table
CREATE TABLE IF NOT EXISTS emc_test_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id VARCHAR(64) REFERENCES emc_standards(id) ON DELETE CASCADE,
  setup_name VARCHAR(128) NOT NULL,
  antenna_distance_m NUMERIC(4, 2) DEFAULT 1.00,
  harness_length_mm INT DEFAULT 1000,
  dielectric_support_mm INT DEFAULT 50,
  ground_plane_type VARCHAR(64) DEFAULT 'Copper / Brass >= 0.5mm',
  lisn_an_type VARCHAR(64) DEFAULT '5uH / 50 Ohm (CISPR 25 / ISO 11452-2)',
  schematic_svg_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CISPR 25 & OEM Limit Curves Table
CREATE TABLE IF NOT EXISTS emc_limit_curves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id VARCHAR(64) REFERENCES emc_standards(id) ON DELETE CASCADE,
  table_name VARCHAR(64) NOT NULL, -- 'Table 8 - ALSE Peak & Average'
  service_name VARCHAR(64) NOT NULL, -- 'FM Broadcast', 'GPS L1', 'LTE Band 7'
  start_freq_mhz NUMERIC(10, 4) NOT NULL,
  stop_freq_mhz NUMERIC(10, 4) NOT NULL,
  class_level INT NOT NULL DEFAULT 5, -- Class 1 to 5
  peak_limit_dbuv NUMERIC(6, 2),
  quasi_peak_limit_dbuv NUMERIC(6, 2),
  avg_limit_dbuv NUMERIC(6, 2),
  is_protected_band BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ingested PDF Documents & Technical Catalog (AI Document Brain)
CREATE TABLE IF NOT EXISTS emc_documents (
  id VARCHAR(64) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(64),
  file_size_bytes BIGINT,
  storage_url TEXT,
  page_count INT,
  extracted_key_points JSONB DEFAULT '[]'::jsonb,
  extracted_graphs JSONB DEFAULT '[]'::jsonb,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Test Runs & Lab Measurement Trace Records
CREATE TABLE IF NOT EXISTS emc_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ecu_name VARCHAR(128) NOT NULL,
  standard_id VARCHAR(64) REFERENCES emc_standards(id) ON DELETE SET NULL,
  target_class INT DEFAULT 5,
  lab_name VARCHAR(128),
  trace_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ freq_mhz: 100.2, measured_dbuv: 24.5 }]
  compliance_status VARCHAR(16) DEFAULT 'pending', -- 'pass' | 'fail' | 'marginal'
  worst_margin_db NUMERIC(5, 2),
  test_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE emc_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE emc_test_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emc_limit_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE emc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emc_test_runs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies for Standards, Setups & Limit Curves
CREATE POLICY "Public Read emc_standards" ON emc_standards FOR SELECT USING (true);
CREATE POLICY "Public Read emc_test_setups" ON emc_test_setups FOR SELECT USING (true);
CREATE POLICY "Public Read emc_limit_curves" ON emc_limit_curves FOR SELECT USING (true);

-- Authenticated / Public CRUD Policies for Documents & Test Runs
CREATE POLICY "Public Read emc_documents" ON emc_documents FOR SELECT USING (true);
CREATE POLICY "Public Insert emc_documents" ON emc_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update emc_documents" ON emc_documents FOR UPDATE USING (true);

CREATE POLICY "Public Read emc_test_runs" ON emc_test_runs FOR SELECT USING (true);
CREATE POLICY "Public Insert emc_test_runs" ON emc_test_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update emc_test_runs" ON emc_test_runs FOR UPDATE USING (true);
CREATE POLICY "Public Delete emc_test_runs" ON emc_test_runs FOR DELETE USING (true);
