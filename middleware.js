// middleware.js — trang quản trị và API quản trị cần đăng nhập.
// Hai đường không đăng nhập bằng mật khẩu (tự kiểm tra mã bí mật bên trong): /api/inbound/* và /api/cron/*
import { NextResponse } from "next/server";

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function middleware(req) {
  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  const header = req.headers.get("authorization") || "";
  let ok = false;
  if (user && pass && /^basic /i.test(header)) {
    try {
      const raw = atob(header.split(" ")[1] || "");
      const text = new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0)));
      const i = text.indexOf(":");
      ok = i >= 0 && safeEqual(text.slice(0, i), user) && safeEqual(text.slice(i + 1), pass);
    } catch {}
  }
  if (!ok) {
    return new NextResponse("Cần đăng nhập để vào trang quản trị.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Web giao hang"' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/shipments/:path*", "/api/shipments"] };
