"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Màu từng tình trạng (chữ trắng trên nền màu, giống bảng đơn hàng quen thuộc)
const COLORS = {
  draft: "#0d9488",
  created: "#2563eb",
  picked: "#7c3aed",
  shipping: "#f97316",
  delivered: "#16a34a",
  returned: "#dc2626",
  cancelled: "#6b7280",
};
const NAMES = {
  draft: "Mới",
  created: "Đã tạo vận đơn",
  picked: "Đã lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  returned: "Hoàn hàng",
  cancelled: "Đã hủy",
};
const TABS = [
  { id: "all", name: "Tất cả" },
  { id: "todo", name: "Cần xử lý" },
  { id: "draft", name: "Mới" },
  { id: "created", name: "Đã tạo vận đơn" },
  { id: "picked", name: "Đã lấy hàng" },
  { id: "shipping", name: "Đang giao" },
  { id: "delivered", name: "Đã giao" },
  { id: "returned", name: "Hoàn hàng" },
  { id: "cancelled", name: "Đã hủy" },
];

const input = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" };
const btn = { padding: "9px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 };
const btnDark = { ...btn, background: "#111", color: "#fff", border: "none" };
const btnBlue = { ...btn, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600 };
const label = { fontSize: 12, color: "#6b7280", marginBottom: 3, display: "block" };
const th = { textAlign: "left", padding: "12px 10px", fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 0 };
const td = { padding: "11px 10px", fontSize: 14, borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" };

const BLANK = { receiverName: "", receiverPhone: "", receiverAddress: "", receiverWard: "", receiverDistrict: "", receiverProvince: "", itemName: "", quantity: 1, unitPrice: 0, shipFee: 0, cod: 0, weight: 0.5, note: "" };

const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const pad = (n) => String(n).padStart(2, "0");
function fmtShort(t) {
  const d = new Date(t);
  if (isNaN(d)) return "";
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `${hm} hôm nay`;
  if (d.toDateString() === y.toDateString()) return `${hm} hôm qua`;
  return `${hm} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
const fmtFull = (t) => {
  const d = new Date(t);
  return isNaN(d) ? String(t) : d.toLocaleString("vi-VN");
};

function Pill({ status }) {
  return (
    <span style={{ display: "inline-block", background: COLORS[status] || "#6b7280", color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
      {NAMES[status] || status}
    </span>
  );
}

const needsAttention = (s) => s.status === "draft" || !!s.lastError;

export default function AdminPage() {
  const [meta, setMeta] = useState({ mock: true, carriers: [] });
  const [list, setList] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState(false); // ngăn chi tiết bên phải
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [carrier, setCarrier] = useState("jnt");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const selRef = useRef(null);
  const dirtyRef = useRef(false);
  const openRef = useRef(false);
  selRef.current = selId;
  dirtyRef.current = dirty;
  openRef.current = open;

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shipments", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi tải");
      setMeta({ mock: d.mock, carriers: d.carriers });
      setList(d.shipments);
      setLoadErr("");
      const cur = d.shipments.find((s) => s.id === selRef.current);
      if (cur && openRef.current && !dirtyRef.current) {
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
    const t2 = setInterval(
      () => fetch("/api/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "syncAll" }) }).then(load).catch(() => {}),
      90000
    );
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [load]);

  const sel = list.find((s) => s.id === selId) || null;
  const editable = !sel || sel.status === "draft";

  function openOrder(s) {
    setSelId(s.id);
    setForm({ ...BLANK, ...s.data });
    setCarrier(s.carrier);
    setDirty(false);
    setMsg("");
    setOpen(true);
  }
  function openNew() {
    setSelId(null);
    setForm(BLANK);
    setCarrier("jnt");
    setDirty(false);
    setMsg("");
    setOpen(true);
  }
  function closePanel() {
    if (dirty && !confirm("Bạn đã sửa nhưng chưa lưu. Đóng thật không?")) return;
    setOpen(false);
    setDirty(false);
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
      if (action === "delete") {
        setOpen(false);
        setSelId(null);
      }
      await load();
      setMsg(action === "push" ? "✅ Đã đẩy đơn sang hãng" : action === "sync" ? "✅ Đã cập nhật tình trạng" : action === "cancel" ? "✅ Đã hủy vận đơn" : "");
    }
  }

  // Lọc theo ô tìm kiếm, rồi đếm số đơn cho từng tab
  const searched = list.filter((s) => {
    if (!q.trim()) return true;
    const t = `${s.id} ${s.data.receiverName} ${s.data.receiverPhone} ${s.billCode} ${s.data.itemName} ${s.data.receiverAddress}`.toLowerCase();
    return t.includes(q.trim().toLowerCase());
  });
  const inTab = (s, id) => (id === "all" ? true : id === "todo" ? needsAttention(s) : s.status === id);
  const counts = {};
  TABS.forEach((t) => (counts[t.id] = searched.filter((s) => inTab(s, t.id)).length));
  const shown = searched.filter((s) => inTab(s, tab));
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = shown.slice((cur - 1) * pageSize, cur * pageSize);
  const sumCod = shown.reduce((a, s) => a + (Number(s.data.cod) || 0), 0);
  const sumShip = shown.reduce((a, s) => a + (Number(s.data.shipFee) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Thanh trên cùng */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 18, whiteSpace: "nowrap" }}>🚚 Web giao hàng</strong>
        <input
          style={{ ...input, flex: "1 1 260px", maxWidth: 560, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" }}
          placeholder="Tìm theo tên, SĐT, mã vận đơn, sản phẩm..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <div style={{ flex: 1 }} />
        {meta.mock && (
          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>CHẾ ĐỘ THỬ — chưa gọi J&T thật</span>
        )}
        <a href="/admin/settings" style={{ ...btn, textDecoration: "none", color: "#111", display: "inline-block" }}>⚙️ Cài đặt</a>
        <button style={btn} onClick={load} title="Tải lại">↻</button>
        <button style={btnBlue} onClick={openNew}>+ Thêm đơn tay</button>
      </div>

      {loadErr && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 20px" }}>Lỗi: {loadErr}</div>}

      {/* Các tab tình trạng */}
      <div style={{ background: "#fff", padding: "10px 20px 0", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            style={{
              ...btn,
              border: tab === t.id ? "1.5px solid #2563eb" : "1px solid transparent",
              background: tab === t.id ? "#eff6ff" : "transparent",
              color: tab === t.id ? "#1d4ed8" : "#374151",
              marginBottom: 10,
              whiteSpace: "nowrap",
              padding: "8px 12px",
            }}
          >
            {t.name}{" "}
            <span style={{ background: tab === t.id ? "#dbeafe" : "#f3f4f6", borderRadius: 999, padding: "1px 8px", fontSize: 12, marginLeft: 4 }}>{counts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Bảng đơn */}
      <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
        <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>VC</th>
              <th style={th}>Khách hàng</th>
              <th style={th}>SĐT</th>
              <th style={th}>Nhận hàng</th>
              <th style={th}>Ghi chú</th>
              <th style={th}>Sản phẩm</th>
              <th style={{ ...th, textAlign: "right" }}>Thời gian tạo</th>
              <th style={{ ...th, textAlign: "right" }}>Cập nhật TT</th>
              <th style={{ ...th, textAlign: "right" }}>Tổng tiền</th>
              <th style={{ ...th, paddingRight: 20 }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: 40 }}>Chưa có đơn nào ở mục này.</td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} onClick={() => openOrder(s)} style={{ cursor: "pointer", background: s.id === selId && open ? "#eff6ff" : "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.background = s.id === selId && open ? "#eff6ff" : "#f9fafb")} onMouseLeave={(e) => (e.currentTarget.style.background = s.id === selId && open ? "#eff6ff" : "transparent")}>
                <td style={{ ...td, color: "#2563eb", whiteSpace: "nowrap" }}>
                  <span title={s.source === "bot" ? "Đơn từ chat" : "Đơn nhập tay"}>{s.source === "bot" ? "💬" : "✍️"}</span> {String(s.id).padStart(3, "0")}
                </td>
                <td style={td}>
                  {s.billCode ? (
                    <span title={`Mã vận đơn: ${s.billCode}`} style={{ background: "#ef4444", color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>J&T ✓</span>
                  ) : null}
                </td>
                <td style={{ ...td, fontWeight: 500, whiteSpace: "nowrap" }}>{s.data.receiverName || <i style={{ color: "#9ca3af" }}>chưa có tên</i>}</td>
                <td style={{ ...td, color: "#2563eb", whiteSpace: "nowrap" }}>{s.data.receiverPhone}</td>
                <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.data.receiverAddress}>{s.data.receiverAddress}</td>
                <td style={{ ...td, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: s.lastError ? "#b91c1c" : "#374151" }} title={s.lastError || s.data.note}>
                  {s.lastError ? `⚠️ ${s.lastError}` : s.data.note}
                </td>
                <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.data.itemName ? `${s.data.itemName} x ${s.data.quantity || 1}` : <span style={{ color: "#dc2626", fontWeight: 600 }}>Chưa có sản phẩm</span>}
                </td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", color: "#374151" }}>{fmtShort(s.createdAt)}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", color: "#374151" }}>{fmtShort(s.lastSyncedAt || s.updatedAt)}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{money(s.data.cod)}</td>
                <td style={{ ...td, paddingRight: 20 }}><Pill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chân trang: tổng + phân trang */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "10px 20px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
        <span>Số đơn: <b>{shown.length}</b></span>
        <span>COD: <b>{money(sumCod)}</b></span>
        <span>Phí ship khách trả: <b>{money(sumShip)}</b></span>
        <div style={{ flex: 1 }} />
        <button style={btn} disabled={cur <= 1} onClick={() => setPage(cur - 1)}>‹</button>
        <span>{cur} / {pages}</span>
        <button style={btn} disabled={cur >= pages} onClick={() => setPage(cur + 1)}>›</button>
        <select style={{ ...input, width: 110 }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          <option value={30}>30 / trang</option>
          <option value={50}>50 / trang</option>
          <option value={100}>100 / trang</option>
        </select>
      </div>

      {/* Ngăn chi tiết đơn (trượt từ bên phải) */}
      {open && (
        <>
          <div onClick={closePanel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 20 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px, 100vw)", background: "#fff", zIndex: 21, boxShadow: "-4px 0 18px rgba(0,0,0,0.18)", overflowY: "auto", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 17 }}>{sel ? `Đơn #${String(sel.id).padStart(3, "0")}` : "Thêm đơn tay"}</strong>
              {sel && <Pill status={sel.status} />}
              <div style={{ flex: 1 }} />
              <button style={btn} onClick={closePanel}>✕</button>
            </div>
            {sel?.billCode && <div style={{ fontSize: 14, marginBottom: 10 }}>Mã vận đơn: <b>{sel.billCode}</b></div>}
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

            <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Thu hộ: <b>{money(form.cod)}</b></div>

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
                      <span style={{ color: "#9ca3af", minWidth: 140 }}>{fmtFull(h.time)}</span>
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
                {sel.lastSyncedAt && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Cập nhật lần cuối: {fmtFull(sel.lastSyncedAt)}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
