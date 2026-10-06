// lib/shipments.js — lưu và đọc đơn giao hàng (Neon Postgres)
import { getSql } from "./db";

function toObj(r) {
  return {
    id: String(r.id),
    source: r.source || "",
    sourceOrderId: r.source_order_id || "",
    data: r.data || {},
    carrier: r.carrier,
    billCode: r.bill_code || "",
    status: r.status,
    statusText: r.status_text || "",
    history: Array.isArray(r.history) ? r.history : [],
    lastError: r.last_error || "",
    lastSyncedAt: r.last_synced_at,
    notifiedStatus: r.notified_status || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listShipments() {
  const sql = await getSql();
  const rows = await sql`SELECT * FROM shipments ORDER BY id DESC LIMIT 300`;
  return rows.map(toObj);
}

export async function getShipment(id) {
  const sql = await getSql();
  const rows = await sql`SELECT * FROM shipments WHERE id = ${Number(id)}`;
  return rows[0] ? toObj(rows[0]) : null;
}

export async function createShipment({ source = "manual", sourceOrderId = null, data = {} }) {
  const sql = await getSql();
  if (sourceOrderId) {
    const old = await sql`SELECT * FROM shipments WHERE source = ${source} AND source_order_id = ${String(sourceOrderId)}`;
    if (old[0]) {
      // Đơn này đã gửi sang rồi: chỉ cập nhật thông tin nếu CHƯA đẩy lên hãng
      if (old[0].status === "draft") {
        await sql`UPDATE shipments SET data = ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE id = ${old[0].id}`;
      }
      return { id: String(old[0].id), existed: true };
    }
  }
  const rows = await sql`INSERT INTO shipments (source, source_order_id, data)
                         VALUES (${source}, ${sourceOrderId ? String(sourceOrderId) : null}, ${JSON.stringify(data)}::jsonb)
                         RETURNING id`;
  return { id: String(rows[0].id), existed: false };
}

export async function updateData(id, data, carrier) {
  const sql = await getSql();
  await sql`UPDATE shipments SET data = ${JSON.stringify(data)}::jsonb,
            carrier = COALESCE(${carrier || null}, carrier), updated_at = now() WHERE id = ${Number(id)}`;
}

export async function setPushed(id, { billCode, txlogisticid, text }) {
  const sql = await getSql();
  const cur = await getShipment(id);
  const data = { ...cur.data, txlogisticid, pushedAt: new Date().toISOString() };
  const history = [{ time: new Date().toISOString(), text: text || "Đã tạo vận đơn" }];
  await sql`UPDATE shipments SET bill_code = ${billCode}, status = 'created', status_text = ${text || "Đã tạo vận đơn"},
            data = ${JSON.stringify(data)}::jsonb, history = ${JSON.stringify(history)}::jsonb,
            last_error = NULL, updated_at = now() WHERE id = ${Number(id)}`;
}

export async function setTracking(id, { status, statusText, history }) {
  const sql = await getSql();
  await sql`UPDATE shipments SET status = ${status}, status_text = ${statusText || ""},
            history = ${JSON.stringify(history || [])}::jsonb, last_error = NULL,
            last_synced_at = now(), updated_at = now() WHERE id = ${Number(id)}`;
}

export async function setError(id, message) {
  const sql = await getSql();
  await sql`UPDATE shipments SET last_error = ${String(message).slice(0, 500)}, updated_at = now() WHERE id = ${Number(id)}`;
}

export async function setCancelled(id) {
  const sql = await getSql();
  const hist = [{ time: new Date().toISOString(), text: "Đã hủy vận đơn" }];
  await sql`UPDATE shipments SET status = 'cancelled', status_text = 'Đã hủy vận đơn',
            history = ${JSON.stringify(hist)}::jsonb, last_error = NULL, updated_at = now() WHERE id = ${Number(id)}`;
}

export async function setNotified(id, status) {
  const sql = await getSql();
  await sql`UPDATE shipments SET notified_status = ${status} WHERE id = ${Number(id)}`;
}

export async function deleteShipment(id) {
  const sql = await getSql();
  await sql`DELETE FROM shipments WHERE id = ${Number(id)}`;
}

/** Các đơn đang chạy cần hỏi lại hãng. */
export async function listActive() {
  const sql = await getSql();
  const rows = await sql`SELECT * FROM shipments WHERE status IN ('created','picked','shipping') AND bill_code IS NOT NULL
                         ORDER BY id DESC LIMIT 60`;
  return rows.map(toObj);
}
