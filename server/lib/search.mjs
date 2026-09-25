/**
 * FTS5 (full-text search) integration for leads.
 *
 * The `leads_fts` virtual table mirrors `leads` data for the searchable
 * columns (name, phone, wilaya, email, material). Triggers keep it in sync.
 *
 * Query flow:
 *   searchLeads(db, 'ali be')
 *     → buildFtsQuery('ali be')
 *     → '"ali"* "be"*'  (implicit AND between tokens)
 *     → MATCH against leads_fts
 *     → bm25() ordering
 */

const FTS_TABLE = 'leads_fts';

/**
 * Convert a free-text user query into a valid FTS5 MATCH expression.
 * - Splits into tokens on whitespace/punctuation
 * - Escapes each token ("*" → phrase prefix match)
 * - Implicit AND between tokens
 */
export function buildFtsQuery(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const tokens = raw
    .trim()
    .split(/[\s,;.·/\\|:+*?!()"'ⓕ\[\]{}-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ');
}

/**
 * Full-text search across the mirrored columns, ranked by bm25.
 * Rowids map back to `leads.rowid` — JOIN there for full rows.
 */
export function searchLeads(d, rawQuery, { limit = 200 } = {}) {
  const match = buildFtsQuery(rawQuery);
  if (!match) return [];
  return d.prepare(`
    SELECT l.*
    FROM leads l
    JOIN ${FTS_TABLE} ON l.rowid = ${FTS_TABLE}.rowid
    WHERE ${FTS_TABLE} MATCH ?
    ORDER BY bm25(${FTS_TABLE})
    LIMIT ?
  `).all(match, limit);
}
