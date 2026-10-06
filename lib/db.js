// lib/db.js — kết nối Neon Postgres, tự tạo bảng nếu chưa có
import { neon } from "@neondatabase/serverless";

let sqlInstance = null;
let readyPromise = null;

export function getSql() {
  if (!readyPromise) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("Chưa có DATABASE_URL — hãy kết nối Neon trong Vercel → Storage.");
    sqlInstance = neon(url);
    readyPromise = init(sqlInstance).catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise.then(() => sqlInstance);
}

async function init(sql) {
  await sql`CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    source TEXT,
    source_order_id TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    carrier TEXT NOT NULL DEFAULT 'jnt',
    bill_code TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    status_text TEXT,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_error TEXT,
    last_synced_at TIMESTAMPTZ,
    notified_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_source ON shipments (source, source_order_id) WHERE source_order_id IS NOT NULL`;
}
