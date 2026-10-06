// lib/sync.js — hỏi hãng vận chuyển tình trạng đơn rồi lưu + báo về web bot chat
import { getCarrier } from "./carriers";
import { getShipment, listActive, setTracking, setError } from "./shipments";
import { notifyBot } from "./notify";

export async function syncOne(id) {
  const s = await getShipment(id);
  if (!s || !s.billCode) return null;
  try {
    const t = await (await getCarrier(s.carrier)).track(s);
    await setTracking(s.id, t);
  } catch (e) {
    await setError(s.id, e.message || e);
  }
  const fresh = await getShipment(id);
  await notifyBot(fresh);
  return fresh;
}

export async function syncAll() {
  const list = await listActive();
  let n = 0;
  for (const s of list) {
    await syncOne(s.id);
    n++;
  }
  return n;
}
