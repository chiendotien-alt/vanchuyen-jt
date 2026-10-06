// lib/carriers/mock.js — hãng giả lập để thử cả luồng mà KHÔNG gọi hãng vận chuyển thật.
// Tình trạng tự nhích theo thời gian kể từ lúc "đẩy đơn": 1 phút → đã lấy hàng, 3 phút → đang giao, 6 phút → đã giao.
export const mock = {
  async createOrder(shipment) {
    const billCode = "MOCK" + String(Date.now()).slice(-8);
    return { billCode, txlogisticid: "S" + shipment.id };
  },
  async cancelOrder() {
    return { ok: true };
  },
  async track(shipment) {
    const start = new Date(shipment.data?.pushedAt || shipment.createdAt).getTime();
    const mins = (Date.now() - start) / 60000;
    const steps = [
      { at: 0, status: "created", text: "Đã tạo vận đơn (giả lập)" },
      { at: 1, status: "picked", text: "Shipper đã lấy hàng (giả lập)" },
      { at: 3, status: "shipping", text: "Đang giao hàng cho khách (giả lập)" },
      { at: 6, status: "delivered", text: "Giao hàng thành công (giả lập)" },
    ];
    const done = steps.filter((s) => mins >= s.at);
    const last = done[done.length - 1];
    const history = done
      .map((s) => ({ time: new Date(start + s.at * 60000).toISOString(), text: s.text }))
      .reverse();
    return { status: last.status, statusText: last.text, history };
  },
};
