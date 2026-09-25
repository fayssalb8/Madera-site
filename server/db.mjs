import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_PATH =
  process.env.DATABASE_PATH ??
  path.join(__dirname, '..', 'server', 'data', 'madera.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DATABASE_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(d) {
  d.exec(`
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
  `);

  // FTS5 full-text search over searchable lead fields
  d.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS leads_fts USING fts5(
      name, phone, wilaya, email, material,
      content='leads', content_rowid='rowid'
    );
  `);

  const ftsCount = d.prepare('SELECT COUNT(*) AS n FROM leads_fts').get();
  const leadsCount = d.prepare('SELECT COUNT(*) AS n FROM leads').get();
  if (ftsCount.n === 0 && leadsCount.n > 0) {
    d.exec(`
      INSERT INTO leads_fts(rowid, name, phone, wilaya, email, material)
      SELECT rowid, name, phone, wilaya, COALESCE(email,''), COALESCE(material,'')
      FROM leads;
    `);
  }

  d.exec(`
    CREATE TRIGGER IF NOT EXISTS leads_ai AFTER INSERT ON leads BEGIN
      INSERT INTO leads_fts(rowid, name, phone, wilaya, email, material)
      VALUES (new.rowid, new.name, new.phone, new.wilaya,
              COALESCE(new.email,''), COALESCE(new.material,''));
    END;
    CREATE TRIGGER IF NOT EXISTS leads_ad AFTER DELETE ON leads BEGIN
      INSERT INTO leads_fts(leads_fts, rowid, name, phone, wilaya, email, material)
      VALUES ('delete', old.rowid, old.name, old.phone, old.wilaya,
              COALESCE(old.email,''), COALESCE(old.material,''));
    END;
    CREATE TRIGGER IF NOT EXISTS leads_au AFTER UPDATE ON leads BEGIN
      INSERT INTO leads_fts(leads_fts, rowid, name, phone, wilaya, email, material)
      VALUES ('delete', old.rowid, old.name, old.phone, old.wilaya,
              COALESCE(old.email,''), COALESCE(old.material,''));
      INSERT INTO leads_fts(rowid, name, phone, wilaya, email, material)
      VALUES (new.rowid, new.name, new.phone, new.wilaya,
              COALESCE(new.email,''), COALESCE(new.material,''));
    END;
  `);
}
