export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { listShipments, createShipment } from "@/lib/shipments";
import { syncAll } from "@/lib/sync";
import { isMock, CARRIERS } from "@/lib/carriers";
import { STATUS_LABELS } from "@/lib/status";

export async function GET() {
  try {
    return NextResponse.json(
      { mock: isMock(), carriers: CARRIERS, labels: STATUS_LABELS, shipments: await listShipments() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// action "create": tạo đơn tay  |  action "syncAll": cập nhật tình trạng tất cả đơn đang chạy
export async function POST(req) {
  try {
    const body = await req.json();
    if (body.action === "syncAll") {
      const n = await syncAll();
      return NextResponse.json({ ok: true, synced: n });
    }
    const d = body.data || {};
    const qty = Math.max(1, Number(d.quantity) || 1);
    const unit = Number(d.unitPrice) || 0;
    const ship = Number(d.shipFee) || 0;
    const r = await createShipment({
      source: "manual",
      data: { weight: 0.5, quantity: qty, unitPrice: unit, shipFee: ship, cod: qty * unit + ship, ...d },
    });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
