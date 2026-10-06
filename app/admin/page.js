"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const COLORS = {
  draft: ["#6b7280", "#f3f4f6"],
  created: ["#1d4ed8", "#dbeafe"],
  picked: ["#7c3aed", "#ede9fe"],
  shipping: ["#b45309", "#fef3c7"],
  delivered: ["#166534", "#dcfce7"],
  returned: ["#b91c1c", "#fee2e2"],
  cancelled: ["#6b7280", "#e5e7eb"],
};

const input = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" };
const btn = { padding: "9px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 };
const btnDark = { ...btn, background: "#111", color: "#fff", border: "none" };
const label = { fontSize: 12, color: "#6b7280", marginBottom: 3, display: "block" };

const BLANK = { receiverName: "", receiverPhone: "", receiverAddress: "", receiverWard: "", receiverDistrict: "", receiverProvince: "", itemName: "", quantity: 1, unitPrice: 0, shipFee: 0, cod: 0, weight: 0.5, note: "" };

function Chip({ status, labels }) {
  const [fg, bg] = COLORS[status] || COLORS.draft;
  return <span style={{ color: fg, background: bg, borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{labels[status] || status}</span>;
}

const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const fmt = (t) => {
  const d = new Date(t);
  return isNaN(d) ? String(t) : d.toLocaleString("vi-VN");
};

export default function AdminPage() {
  const [meta, setMeta] = useState({ mock: true, carriers: [], labels: {} });
  const [list, setList] = useState([]);
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [carrier, setCarrier] = useState("jnt");
  const [dirty, setDirty] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const selRef = useRef(null);
  const dirtyRef = useRef(false);
  selRef.current = selId;
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shipments", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi tải");
      setMeta({ mock: d.mock, carriers: d.carriers, labels: d.labels });
      setList(d.shipments);
      setLoadErr("");
      // Làm mới ô thông tin nếu đang xem đơn và chưa gõ gì dở
      const cur = d.shipments.find((s) => s.id === selRef.current);
      if (cur && !dirtyRef.current) {
        setForm({ ...BLANK, ...cur.data });
        setCarrier(cur.carrier);
      }
    } catch (e) {
      setLoadErr(String(e.message || e));
    }
  }, []);

  useEffect(() => {
    load();
    const t1 = setInterval(load, 20000);
    // Mở trang thì cứ 90 giây tự hỏi hãng tình trạng mới
    const t2 = setInterval(() => fetch("/api/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "syncAll" }) }).then(load).catch(() => {}), 90000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [load]);

  const sel = list.find((s) => s.id === selId) || null;
  const editable = !sel || sel.status === "draft";

  function pick(s) {
    setSelId(s.id);
    setForm({ ...BLANK, ...s.data });
    setCarrier(s.carrier);
    setDirty(false);
    setMsg("");
  }

  function set(k, v) {
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (["quantity", "unitPrice", "shipFee"].includes(k)) n.cod = (Number(n.quantity) || 0) * (Number(n.unitPrice) || 0) + (Number(n.shipFee) || 0);
      return n;
    });
    setDirty(true);
  }

  async function call(url, method, body, name) {
    setBusy(name);
    setMsg("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg("❌ " + (d.error || "Lỗi"));
        await load();
        return null;
      }
      return d;
    } catch {
      setMsg("❌ Lỗi mạng, thử lại nhé.");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (!sel) {
      const d = await call("/api/shipments", "POST", { action: "create", data: form }, "save");
      if (d?.ok) {
        setDirty(false);
        await load();
        setSelId(d.id);
        setMsg("✅ Đã tạo đơn");
      }
      return;
    }
    const d = await call(`/api/shipments/${sel.id}`, "PUT", { data: form, carrier }, "save");
    if (d?.ok) {
      setDirty(false);
      await load();
      setMsg("✅ Đã lưu");
    }
  }

  async function act(action, confirmText) {
    if (!sel) return;
    if (confirmText && !confirm(confirmText)) return;
    if (dirty && action === "push") {
      const s = await call(`/api/shipments/${sel.id}`, "PUT", { data: form, carrier }, "save");
      if (!s?.ok) return;
      setDirty(false);
    }
    const d = await call(`/api/shipments/${sel.id}`, "POST", { action }, action);
    if (d?.ok) {
      if (action === "delete") setSelId(null);
      await load();
      setMsg(action === "push" ? "✅ Đã đẩy đơn sang hãng" : action === "sync" ? "✅ Đã cập nhật tình trạng" : action === "cancel" ? "✅ Đã hủy vận đơn" : "");
    }
  }

  const shown = list.filter((s) => {
    if (!q.trim()) return true;
    const t = (s.data.receiverName + " " + s.data.receiverPhone + " " + s.billCode + " " + s.data.itemName).toLowerCase();
    return t.includes(q.trim().toLowerCase());
  });

  const L = meta.labels;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 18 }}>🚚 Web giao hàng</strong>
        {meta.mock && (
          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 8, padding: "4px 10px", fontSize: 13 }}>
            CHẾ ĐỘ THỬ — chưa gọi J&T thật (mã vận đơn là giả)
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button style={btn} onClick={() => { setSelId(null); setForm(BLANK); setCarrier("jnt"); setDirty(false); setMsg(""); }}>+ Tạo đơn tay</button>
        <button style={btn} onClick={load}>↻ Tải lại</button>
      </div>

      {loadErr && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 20px" }}>Lỗi: {loadErr}</div>}

      <div style={{ display: "flex", gap: 16, padding: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Danh sách đơn */}
        <div style={{ flex: "1 1 340px", maxWidth: 440, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
          <input style={{ ...input, marginBottom: 10 }} placeholder="Tìm theo tên, SĐT, mã vận đơn..." value={q} onChange={(e) => setQ(e.target.value)} />
          {shown.length === 0 && <div style={{ color: "#9ca3af", padding: 16, textAlign: "center", fontSize: 14 }}>Chưa có đơn nào.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "75vh", overflowY: "auto" }}>
            {shown.map((s) => (
              <div key={s.id} onClick={() => pick(s)} style={{ padding: 10, borderRadius: 10, cursor: "pointer", border: s.id === selId ? "2px solid #111" : "1px solid #e5e7eb", background: s.id === selId ? "#f9fafb" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>{s.data.receiverName || "(chưa có tên)"}</strong>
                  <Chip status={s.status} labels={L} />
                </div>
                <div style={{ fontSize: 13, color: "#4b5563", marginTop: 3 }}>{s.data.receiverPhone} · {s.data.itemName}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {s.billCode ? `Mã vận đơn: ${s.billCode}` : "Chưa có mã vận đơn"}
                  {s.source === "bot" ? " · từ chat" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chi tiết đơn */}
        <div style={{ flex: "2 1 480px", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 16 }}>{sel ? `Đơn #${sel.id}` : "Đơn mới"}</strong>
            {sel && <Chip status={sel.status} labels={L} />}
            {sel?.billCode && <span style={{ fontSize: 13, color: "#374151" }}>Mã vận đơn: <b>{sel.billCode}</b></span>}
          </div>

          {sel?.lastError && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>⚠️ {sel.lastError}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><span style={label}>Tên người nhận</span><input style={input} disabled={!editable} value={form.receiverName} onChange={(e) => set("receiverName", e.target.value)} /></div>
            <div><span style={label}>Số điện thoại</span><input style={input} disabled={!editable} value={form.receiverPhone} onChange={(e) => set("receiverPhone", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><span style={label}>Địa chỉ đầy đủ (số nhà, đường...)</span><textarea style={{ ...input, minHeight: 56 }} disabled={!editable} value={form.receiverAddress} onChange={(e) => set("receiverAddress", e.target.value)} /></div>
            <div><span style={label}>Phường / Xã</span><input style={input} disabled={!editable} value={form.receiverWard} onChange={(e) => set("receiverWard", e.target.value)} /></div>
            <div><span style={label}>Quận / Huyện</span><input style={input} disabled={!editable} value={form.receiverDistrict} onChange={(e) => set("receiverDistrict", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><span style={label}>Tỉnh / Thành phố</span><input style={input} disabled={!editable} value={form.receiverProvince} onChange={(e) => set("receiverProvince", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><span style={label}>Sản phẩm (tên + màu/size)</span><input style={input} disabled={!editable} value={form.itemName} onChange={(e) => set("itemName", e.target.value)} /></div>
            <div><span style={label}>Số lượng</span><input style={input} type="number" min="1" disabled={!editable} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
            <div><span style={label}>Đơn giá (đ)</span><input style={input} type="number" min="0" disabled={!editable} value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} /></div>
            <div><span style={label}>Phí ship khách trả (đ)</span><input style={input} type="number" min="0" disabled={!editable} value={form.shipFee} onChange={(e) => set("shipFee", e.target.value)} /></div>
            <div><span style={label}>Tiền thu hộ COD (đ) — tự tính, sửa được</span><input style={input} type="number" min="0" disabled={!editable} value={form.cod} onChange={(e) => { setForm((f) => ({ ...f, cod: e.target.value })); setDirty(true); }} /></div>
            <div><span style={label}>Cân nặng (kg)</span><input style={input} type="number" step="0.1" min="0.1" disabled={!editable} value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
            <div>
              <span style={label}>Hãng vận chuyển</span>
              <select style={input} disabled={!editable} value={carrier} onChange={(e) => { setCarrier(e.target.value); setDirty(true); }}>
                {(meta.carriers.length ? meta.carriers : [{ id: "jnt", name: "J&T Express" }]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}><span style={label}>Ghi chú giao hàng</span><input style={input} disabled={!editable} value={form.note} onChange={(e) => set("note", e.target.value)} /></div>
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>Thu hộ: <b>{money(form.cod)}</b></div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            {editable && <button style={btn} disabled={!!busy} onClick={save}>{busy === "save" ? "Đang lưu..." : sel ? "Lưu" : "Tạo đơn"}</button>}
            {sel && sel.status === "draft" && (
              <button style={btnDark} disabled={!!busy} onClick={() => act("push", `Đẩy đơn của ${form.receiverName || "khách"} sang ${meta.mock ? "hãng (chế độ thử)" : "J&T"}?`)}>
                {busy === "push" ? "Đang đẩy..." : "🚀 Đẩy sang J&T"}
              </button>
            )}
            {sel?.billCode && <button style={btn} disabled={!!busy} onClick={() => act("sync")}>{busy === "sync" ? "Đang cập nhật..." : "↻ Cập nhật tình trạng"}</button>}
            {sel?.billCode && !["delivered", "returned", "cancelled"].includes(sel.status) && (
              <button style={{ ...btn, color: "#b91c1c" }} disabled={!!busy} onClick={() => act("cancel", "Hủy vận đơn này bên hãng?")}>Hủy vận đơn</button>
            )}
            {sel && ["draft", "cancelled"].includes(sel.status) && (
              <button style={{ ...btn, color: "#b91c1c" }} disabled={!!busy} onClick={() => act("delete", "Xóa đơn này hẳn?")}>Xóa</button>
            )}
            <span style={{ fontSize: 14 }}>{msg}</span>
          </div>

          {sel && sel.history.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <strong style={{ fontSize: 14 }}>Hành trình đơn hàng</strong>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {sel.history.map((h, i) => (
                  <div key={i} style={{ fontSize: 13, display: "flex", gap: 10 }}>
                    <span style={{ color: "#9ca3af", minWidth: 140 }}>{fmt(h.time)}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
              {sel.lastSyncedAt && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Cập nhật lần cuối: {fmt(sel.lastSyncedAt)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
