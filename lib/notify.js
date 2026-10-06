// lib/notify.js — báo tình trạng đơn về web bot chat (nếu đơn đến từ web bot chat)
import { toBotStatus } from "./status";
import { setNotified } from "./shipments";

export async function notifyBot(shipment) {
  try {
    const base = (process.env.BOT_WEB_URL || "").replace(/\/$/, "");
    if (!base || shipment.source !== "bot" || !shipment.sourceOrderId) return;
    const botStatus = toBotStatus(shipment.status);
    if (shipment.notifiedStatus === shipment.status) return; // đã báo tình trạng này rồi
    const res = await fetch(`${base}/api/orders/status-hook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-shared-secret": process.env.SHARED_SECRET || "" },
      body: JSON.stringify({
        orderId: shipment.sourceOrderId,
        status: botStatus,
        statusDetail: shipment.status,
        statusText: shipment.statusText,
        billCode: shipment.billCode,
        carrier: shipment.carrier,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) await setNotified(shipment.id, shipment.status);
    else console.error("Báo về web bot chat lỗi:", res.status);
  } catch (e) {
    console.error("Không báo được về web bot chat:", e.message);
  }
}
