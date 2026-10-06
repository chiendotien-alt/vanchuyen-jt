// lib/carriers/index.js — chọn hãng vận chuyển. CARRIER_MOCK=1 (mặc định) → luôn dùng hãng giả lập, không gọi J&T thật.
import { jnt } from "./jnt";
import { mock } from "./mock";

export function isMock() {
  const v = (process.env.CARRIER_MOCK ?? "1").trim();
  return v !== "0";
}

export const CARRIERS = [{ id: "jnt", name: "J&T Express" }];

export function getCarrier(id) {
  if (isMock()) return mock;
  if (id === "jnt") return jnt;
  throw new Error("Hãng vận chuyển chưa hỗ trợ: " + id);
}
