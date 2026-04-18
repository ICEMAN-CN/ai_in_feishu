#!/usr/bin/env bash
# Wipe local SQLite config and re-init schema. Fixes bad/cross-key encrypted model rows.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATA_DIR="${DATA_DIR:-./data}"
DB="${SQLITE_PATH:-$DATA_DIR/config.db}"

rm -f "$DB" "$DB-wal" "$DB-shm"
echo "[reset-local-demo] Removed: $DB (+ WAL/SHM if present)"

npm run init-db

echo ""
echo "[reset-local-demo] Next:"
echo "  1. export ADMIN_API_KEY=demo-admin-login   # or use ./start-dev.sh defaults"
echo "  2. export ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
echo "  3. npm run dev   (backend)"
echo "  4. cd admin && npm run dev   → open /admin/login , API Key: demo-admin-login"
echo ""
