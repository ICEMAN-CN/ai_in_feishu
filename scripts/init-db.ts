/**
 * AI_Feishu SQLite Database Initialization CLI
 *
 * Usage: npm run init-db
 * Or: npx tsx scripts/init-db.ts
 */

import { initDatabase } from '../src/core/config-store.js';

console.log('[init-db] Starting database initialization...');

try {
  const db = initDatabase();
  console.log('[init-db] Database initialized successfully');

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[init-db] Tables created:', tables.map((t: any) => t.name).join(', '));

  db.close();
  console.log('[init-db] Done!');
} catch (error) {
  console.error('[init-db] Error:', error);
  process.exit(1);
}
