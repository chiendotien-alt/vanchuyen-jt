// lib/carriers/jnt.js — kết nối J&T Express Việt Nam (API "logistics_interface")
//
// ⚠️ QUAN TRỌNG: phần này viết theo tài liệu công khai tại api-docs.jtexpress.vn nhưng CHƯA được thử với tài khoản J&T thật.
//   Những chỗ đánh dấu [KIỂM TRA] là tên trường / đường dẫn tôi chưa xác nhận được — khi J&T cấp tài khoản thử,
//   đối chiếu với tài liệu J&T gửi cho bạn rồi sửa ngay trong file này (chỉ vài dòng).
import { createHash } from "crypto";
import { guessStatusFromText } from "../status";
import { parseAddress } from "../address";

const env = (k) => (process.env[k] || "").trim();

// Đường dẫn các API (cộng sau JNT_API_BASE). Tạo đơn + tra hành trình lấy từ tài liệu J&T; hủy đơn [KIỂM TRA].
const PATH_CREATE = env("JNT_CREATE_PATH") || "/order/orderAction!createOrder.action";
const PATH_UPDATE = env("JNT_CANCEL_PATH") || "/order/orderAction!updateOrder.action"; // [KIỂM TRA]
const PATH_TRACK = env("JNT_TRACK_PATH") || "/standart/trackAction!trackForJson.action";

// data_digest theo tài liệu J&T: base64( md5( logistics_interface + KEY ) ) — md5 dạng chuỗi hex như ví dụ PHP của J&T
export function makeDigest(logisticsInterface, key) {
  const md5hex = createHash("md5").update(logisticsInterface + key, "utf8").digest("hex");
  return Buffer.from(md5hex, "utf8").toString("base64");
}

async function call(path, msgType, payload) {
  const base = env("JNT_API_BASE").replace(/\/$/, "");
  if (!base || !env("JNT_ECCOMPANYID") || !env("JNT_KEY")) {
    throw new Error("Chưa điền thông tin J&T (JNT_API_BASE, JNT_ECCOMPANYID, JNT_KEY) trong Vercel.");
  }
  const li = JSON.stringify(payload);
  const body = new URLSearchParams({
    logistics_interface: li,
    data_digest: makeDigest(li, env("JNT_KEY")),
    msg_type: msgType,
    eccompanyid: env("JNT_ECCOMPANYID"),
  });
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok) throw new Error(`J&T trả lỗi HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (!json) throw new Error("J&T trả về dữ liệu lạ: " + text.slice(0, 200));
  return json;
}

const item0 = (json) => (Array.isArray(json.responseitems) ? json.responseitems[0] : json) || {};
const isOk = (it) => String(it.success).toLowerCase() === "true" || it.success === true;
const reasonOf = (it) => it.reason || it.message || it.msg || it.errorMsg || "không rõ lý do";

function vnd(n) {
  return String(Math.round(Number(n) || 0));
}

/** Dữ liệu tạo đơn. [KIỂM TRA] tên các trường người gửi / người nhận / hàng hóa với tài liệu J&T cấp cho bạn. */
export function buildCreatePayload(shipment, txlogisticid) {
  const d = shipment.data || {};
  const parsed = parseAddress(d.receiverAddress);
  const ward = d.receiverWard || parsed.ward;
  const district = d.receiverDistrict || parsed.district;
  const province = d.receiverProvince || parsed.province;
  const street = d.receiverWard || d.receiverDistrict || d.receiverProvince ? d.receiverAddress : parsed.street;
  const qty = Math.max(1, Number(d.quantity) || 1);
  return {
    eccompanyid: env("JNT_ECCOMPANYID"),
    customerid: env("JNT_CUSTOMERID"),
    txlogisticid,
    ordertype: "1",
    servicetype: "1",
    sender: {
      name: env("SENDER_NAME"),
      mobile: env("SENDER_PHONE"),
      prov: env("SENDER_PROVINCE"),
      city: env("SENDER_DISTRICT"),
      area: env("SENDER_WARD"),
      address: env("SENDER_ADDRESS"),
    },
    receiver: {
      name: d.receiverName || "",
      mobile: d.receiverPhone || "",
      prov: province,
      city: district,
      area: ward,
      address: street || d.receiverAddress || "",
    },
    weight: String(Number(d.weight) > 0 ? Number(d.weight) : 0.5),
    totalquantity: String(qty),
    itemsvalue: vnd(d.cod), // tiền thu hộ (COD) [KIỂM TRA]
    items: [{ itemname: d.itemName || "Hàng hóa", number: String(qty), itemvalue: vnd(d.unitPrice) }],
    remark: d.note || "",
  };
}

export const jnt = {
  async createOrder(shipment) {
    const txlogisticid = shipment.data?.txlogisticid || "S" + shipment.id;
    const json = await call(PATH_CREATE, "ORDERCREATE", buildCreatePayload(shipment, txlogisticid));
    const it = item0(json);
    if (!isOk(it)) throw new Error("J&T từ chối đơn: " + reasonOf(it));
    const billCode = it.billcode || it.billCode || json.billcode;
    if (!billCode) throw new Error("J&T nhận đơn nhưng không trả mã vận đơn.");
    return { billCode: String(billCode), txlogisticid };
  },

  async cancelOrder(shipment) {
    const json = await call(PATH_UPDATE, "UPDATE", {
      eccompanyid: env("JNT_ECCOMPANYID"),
      logisticproviderid: "JNT",
      fieldlist: [
        {
          txlogisticid: shipment.data?.txlogisticid || "S" + shipment.id,
          fieldname: "status",
          fieldvalue: "WITHDRAW",
          remark: "Shop hủy đơn",
        },
      ],
    });
    const it = item0(json);
    if (!isOk(it)) throw new Error("J&T không hủy được: " + reasonOf(it));
    return { ok: true };
  },

  async track(shipment) {
    const json = await call(PATH_TRACK, "TRACKQUERY", {
      eccompanyid: env("JNT_ECCOMPANYID"),
      billcode: shipment.billCode,
      lang: "vi", // [KIỂM TRA] mã ngôn ngữ J&T hỗ trợ
    });
    const events = extractEvents(json);
    if (!events.length) return { status: shipment.status, statusText: shipment.statusText, history: shipment.history };
    // Mới nhất trước
    events.sort((a, b) => String(b.time).localeCompare(String(a.time)));
    let status = shipment.status;
    for (const ev of events) {
      const g = guessStatusFromText(ev.text);
      if (g) {
        status = g;
        break;
      }
    }
    return { status, statusText: events[0].text, history: events };
  },
};

/** Tìm danh sách các mốc hành trình trong phản hồi J&T (cấu trúc có thể khác nhau nên dò tự động). [KIỂM TRA] */
export function extractEvents(json) {
  const found = [];
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length && v.every((x) => x && typeof x === "object")) {
        const ev = v.map(toEvent).filter(Boolean);
        if (ev.length === v.length) found.push(ev);
      }
      v.forEach(walk);
    } else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(json);
  found.sort((a, b) => b.length - a.length);
  return found[0] || [];
}

function toEvent(o) {
  const lower = {};
  for (const [k, v] of Object.entries(o)) lower[k.toLowerCase()] = v;
  const time = lower.scantime || lower.time || lower.scandate || lower.datetime;
  const text = lower.desc || lower.description || lower.scanstatus || lower.status || lower.remark || lower.scantype;
  if (!time || !text) return null;
  return { time: String(time), text: String(text) };
}
