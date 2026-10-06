// lib/carriers/index.js — chọn hãng vận chuyển theo cài đặt (chế độ thử → hãng giả lập, không gọi J&T thật).
import { jnt } from "./jnt";
import { mock } from "./mock";
import { isMock } from "../settings";

export { isMock };
export const CARRIERS = [{ id: "jnt", name: "J&T Express" }];

export async function getCarrier(id) {
  if (await isMock()) return mock;
  if (id === "jnt") return jnt;
  throw new Error("Hãng vận chuyển chưa hỗ trợ: " + id);
}
