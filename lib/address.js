// lib/address.js — tách địa chỉ khách viết thành: số nhà/đường, phường/xã, quận/huyện, tỉnh/thành (đoán theo dấu phẩy)
export function parseAddress(address) {
  const parts = String(address || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 4) {
    return {
      street: parts.slice(0, -3).join(", "),
      ward: parts[parts.length - 3],
      district: parts[parts.length - 2],
      province: parts[parts.length - 1],
    };
  }
  if (parts.length === 3) return { street: parts[0], ward: "", district: parts[1], province: parts[2] };
  return { street: String(address || "").trim(), ward: "", district: "", province: "" };
}
