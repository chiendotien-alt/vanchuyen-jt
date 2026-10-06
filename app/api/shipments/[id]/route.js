export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getShipment, updateData, setPushed, setError, setCancelled, deleteShipment } from "@/lib/shipments";
import { getCarrier } from "@/lib/carriers";
import { syncOne } from "@/lib/sync";
import { notifyBot } from "@/lib/notify";

const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(req, { params }) {
  const s = await getShipment(params.id);
  return s ? NextResponse.json(s) : bad("Không thấy đơn", 404);
}

// Sửa thông tin đơn (chỉ khi chưa đẩy lên hãng)
export async function PUT(req, { params }) {
  try {
    const s = await getShipment(params.id);
    if (!s) return bad("Không thấy đơn", 404);
    if (s.status !== "draft") return bad("Đơn đã đẩy lên hãng, không sửa được nữa.");
    const { data, carrier } = await req.json();
    await updateData(s.id, { ...s.data, ...(data || {}) }, carrier);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return bad(String(err.message || err), 500);
  }
}

// action: "push" (đẩy sang hãng) | "sync" (cập nhật tình trạng) | "cancel" (hủy vận đơn)
export async function POST(req, { params }) {
  try {
    const { action } = await req.json();
    const s = await getShipment(params.id);
    if (!s) return bad("Không thấy đơn", 404);

    if (action === "push") {
      if (s.status !== "draft") return bad("Đơn này đã được đẩy rồi.");
      const d = s.data;
      if (!d.receiverName || !d.receiverPhone || !d.receiverAddress) return bad("Thiếu tên, số điện thoại hoặc địa chỉ người nhận.");
      try {
        const r = await (await getCarrier(s.carrier)).createOrder(s);
        await setPushed(s.id, { billCode: r.billCode, txlogisticid: r.txlogisticid });
      } catch (e) {
        await setError(s.id, e.message || e);
        return bad(e.message || "Đẩy đơn lỗi");
      }
      await notifyBot(await getShipment(s.id));
      return NextResponse.json({ ok: true });
    }

    if (action === "sync") {
      if (!s.billCode) return bad("Đơn chưa có mã vận đơn.");
      await syncOne(s.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      if (!s.billCode || ["delivered", "returned", "cancelled"].includes(s.status)) return bad("Đơn này không hủy được.");
      try {
        await (await getCarrier(s.carrier)).cancelOrder(s);
      } catch (e) {
        await setError(s.id, e.message || e);
        return bad(e.message || "Hủy đơn lỗi");
      }
      await setCancelled(s.id);
      await notifyBot(await getShipment(s.id));
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (!["draft", "cancelled"].includes(s.status)) return bad("Chỉ xóa được đơn chưa đẩy hoặc đã hủy.");
      await deleteShipment(s.id);
      return NextResponse.json({ ok: true });
    }

    return bad("Thao tác không hợp lệ");
  } catch (err) {
    return bad(String(err.message || err), 500);
  }
}
