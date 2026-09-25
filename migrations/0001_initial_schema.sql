-- Migration 0001: Initial schema
-- Ported from server/db.mjs migrate() function

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  email TEXT,
  material TEXT,
  hardware TEXT,
  measures TEXT,
  oven_column TEXT,
  dishwasher TEXT,
  washing_machine TEXT,
  attachments TEXT,
  drawers INTEGER,
  columns INTEGER,
  wall_cabinets INTEGER,
  accessories TEXT,
  estimate_low REAL,
  estimate_high REAL,
  currency TEXT DEFAULT 'DZD',
  source TEXT DEFAULT 'website_wizard',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','won','lost')),
  notes TEXT,
  assigned_to TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON lead_notes(lead_id);
