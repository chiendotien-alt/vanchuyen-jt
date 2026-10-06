// lib/status.js — các tình trạng đơn dùng chung cho cả web giao hàng và web bot chat
export const STATUS_LABELS = {
  draft: "Chưa đẩy",
  created: "Đã tạo vận đơn",
  picked: "Đã lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  returned: "Hoàn hàng",
  cancelled: "Đã hủy",
};

// Tình trạng bên web bot chat chỉ có 4 loại: draft / shipped / delivered / returned
export function toBotStatus(status) {
  if (status === "delivered") return "delivered";
  if (status === "returned" || status === "cancelled") return "returned";
  if (status === "created" || status === "picked" || status === "shipping") return "shipped";
  return "draft";
}

const strip = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

/** Đoán tình trạng từ dòng mô tả hành trình của hãng (ưu tiên dòng mới nhất). */
export function guessStatusFromText(text) {
  const t = strip(text);
  if (!t) return null;
  const has = (arr) => arr.some((k) => t.includes(k));
  if (has(["giao hang thanh cong", "da giao", "ky nhan", "hoan thanh", "signed", "delivered"])) return "delivered";
  if (has(["chuyen hoan", "hoan hang", "hoan tra", "tra ve nguoi gui", "tra hang", "return"])) return "returned";
  if (has(["huy don", "da huy", "cancel", "withdraw"])) return "cancelled";
  if (has(["dang giao", "phat hang", "delivering", "dang van chuyen", "den buu cuc", "chuyen tiep", "transit", "xuat kho", "nhap kho"])) return "shipping";
  if (has(["lay hang", "da nhan hang", "pickup", "picked", "nhan hang"])) return "picked";
  return null;
}
