export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { getPublicConfig, getConfig, saveConfig } from "@/lib/settings";
import { testConnection } from "@/lib/carriers/jnt";

export async function GET() {
  try {
    return NextResponse.json(await getPublicConfig(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// PUT: lưu cài đặt  |  POST {action:"test"}: thử kết nối J&T bằng cài đặt đã lưu
export async function PUT(req) {
  try {
    await saveConfig(await req.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action } = await req.json();
    if (action !== "test") return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
    return NextResponse.json(await testConnection(await getConfig()));
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
