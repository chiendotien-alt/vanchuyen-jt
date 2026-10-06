export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";

// Tự động cập nhật tình trạng tất cả đơn đang chạy.
// Được gọi bởi: (1) Vercel Cron mỗi ngày 1 lần, (2) dịch vụ cron miễn phí bên ngoài nếu bạn muốn nhanh hơn
// (đặt địa chỉ  https://TEN-WEB/api/cron/sync?key=SHARED_SECRET  gọi mỗi 10–15 phút).
export async function GET(req) {
  const secret = process.env.SHARED_SECRET || "";
  const cron = process.env.CRON_SECRET || "";
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const ok =
    (secret && (url.searchParams.get("key") === secret || req.headers.get("x-shared-secret") === secret)) ||
    (cron && auth === `Bearer ${cron}`);
  if (!ok) return NextResponse.json({ error: "Không có quyền." }, { status: 401 });
  try {
    const n = await syncAll();
    return NextResponse.json({ ok: true, synced: n });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
