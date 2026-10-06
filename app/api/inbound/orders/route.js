export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createShipment } from "@/lib/shipments";
import { parseAddress } from "@/lib/address";

// Web bot chat gửi đơn nháp sang đây.
// Header bắt buộc: x-shared-secret = SHARED_SECRET (dùng chung 2 web)
// Body: { source: "bot", sourceOrderId: "123", order: { customerName, phone, address, productName, variant, quantity, unitPrice, shipFee, note } }
export async function POST(req) {
  try {
    const secret = process.env.SHARED_SECRET || "";
    if (!secret || req.headers.get("x-shared-secret") !== secret) {
      return NextResponse.json({ error: "Sai mã bí mật." }, { status: 401 });
    }
    const body = await req.json();
    const o = body.order || {};
    const qty = Math.max(1, Number(o.quantity) || 1);
    const unit = Number(o.unitPrice) || 0;
    const ship = Number(o.shipFee) || 0;
    const p = parseAddress(o.address);
    const data = {
      receiverName: o.customerName || "",
      receiverPhone: o.phone || "",
      receiverAddress: o.address || "",
      receiverWard: p.ward,
      receiverDistrict: p.district,
      receiverProvince: p.province,
      itemName: [o.productName, o.variant].filter(Boolean).join(" - ") || "Hàng hóa",
      quantity: qty,
      unitPrice: unit,
      shipFee: ship,
      cod: qty * unit + ship,
      weight: 0.5,
      note: o.note || "",
    };
    const r = await createShipment({
      source: String(body.source || "bot"),
      sourceOrderId: body.sourceOrderId ? String(body.sourceOrderId) : null,
      data,
    });
    return NextResponse.json({ ok: true, id: r.id, existed: r.existed });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
