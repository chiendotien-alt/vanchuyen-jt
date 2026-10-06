// lib/settings.js — cài đặt lưu trong cơ sở dữ liệu (sửa ngay trên web, không cần vào Vercel).
// Nếu một ô chưa điền trong web thì dùng biến môi trường Vercel cũ (nếu có) để không hỏng cài đặt trước đây.
import { getSql } from "./db";

export const FIELDS = [
  "mock", // "1" = chế độ thử, "0" = J&T thật
  "jntApiBase",
  "jntEccompanyid",
  "jntCustomerid",
  "jntKey",
  "senderName",
  "senderPhone",
  "senderAddress",
  "senderWard",
  "senderDistrict",
  "senderProvince",
  "pathCreate",
  "pathCancel",
  "pathTrack",
];

const ENV_FALLBACK = {
  jntApiBase: "JNT_API_BASE",
  jntEccompanyid: "JNT_ECCOMPANYID",
  jntCustomerid: "JNT_CUSTOMERID",
  jntKey: "JNT_KEY",
  senderName: "SENDER_NAME",
  senderPhone: "SENDER_PHONE",
  senderAddress: "SENDER_ADDRESS",
  senderWard: "SENDER_WARD",
  senderDistrict: "SENDER_DISTRICT",
  senderProvince: "SENDER_PROVINCE",
  pathCreate: "JNT_CREATE_PATH",
  pathCancel: "JNT_CANCEL_PATH",
  pathTrack: "JNT_TRACK_PATH",
};

async function readDb() {
  const sql = await getSql();
  const rows = await sql`SELECT key, value FROM app_settings`;
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Cài đặt đầy đủ (kể cả khóa bí mật) — chỉ dùng phía máy chủ. */
export async function getConfig() {
  const db = await readDb();
  const cfg = {};
  for (const f of FIELDS) {
    const envName = ENV_FALLBACK[f];
    const fromDb = (db[f] ?? "").trim();
    cfg[f] = fromDb || (envName ? (process.env[envName] || "").trim() : "");
  }
  // Chế độ thử: ưu tiên giá trị lưu trên web; chưa lưu thì xem biến CARRIER_MOCK; mặc định là thử (an toàn)
  if (db.mock === "0" || db.mock === "1") cfg.mock = db.mock;
  else cfg.mock = (process.env.CARRIER_MOCK ?? "1").trim() === "0" ? "0" : "1";
  return cfg;
}

export async function isMock() {
  return (await getConfig()).mock !== "0";
}

/** Bản gửi cho trình duyệt: khóa bí mật bị che. */
export async function getPublicConfig() {
  const cfg = await getConfig();
  const pub = { ...cfg };
  pub.hasKey = !!cfg.jntKey;
  pub.jntKey = cfg.jntKey ? "••••••••" + cfg.jntKey.slice(-3) : "";
  return pub;
}

export async function saveConfig(input) {
  const sql = await getSql();
  for (const f of FIELDS) {
    if (!(f in input)) continue;
    let v = String(input[f] ?? "").trim();
    if (f === "jntKey" && (v === "" || v.startsWith("••••"))) continue; // để trống / còn che = giữ khóa cũ
    if (f === "mock") v = v === "0" ? "0" : "1";
    await sql`INSERT INTO app_settings (key, value, updated_at) VALUES (${f}, ${v}, now())
              ON CONFLICT (key) DO UPDATE SET value = ${v}, updated_at = now()`;
  }
}
