"use client";
import { useEffect, useState } from "react";

const input = { width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" };
const btn = { padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 };
const btnBlue = { ...btn, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600 };
const label = { fontSize: 13, color: "#4b5563", marginBottom: 4, display: "block" };
const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 16 };
const hint = { fontSize: 12, color: "#9ca3af", marginTop: 4 };

const EMPTY = {
  mock: "1", jntApiBase: "", jntEccompanyid: "", jntCustomerid: "", jntKey: "",
  senderName: "", senderPhone: "", senderAddress: "", senderWard: "", senderDistrict: "", senderProvince: "",
  pathCreate: "", pathCancel: "", pathTrack: "",
};

export default function SettingsPage() {
  const [f, setF] = useState(EMPTY);
  const [hasKey, setHasKey] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [test, setTest] = useState(null);
  const [showAdv, setShowAdv] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setF({ ...EMPTY, ...d });
        setHasKey(!!d.hasKey);
        setLoaded(true);
      })
      .catch((e) => setMsg("❌ " + e.message));
  }, []);

  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  async function save() {
    setBusy("save");
    setMsg("");
    try {
      const body = { ...f };
      delete body.hasKey;
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi lưu");
      const again = await (await fetch("/api/settings", { cache: "no-store" })).json();
      setF({ ...EMPTY, ...again });
      setHasKey(!!again.hasKey);
      setShowKey(false);
      setMsg("✅ Đã lưu cài đặt");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy("");
    }
  }

  async function runTest() {
    setBusy("test");
    setTest(null);
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
      setTest(await r.json());
    } catch {
      setTest({ ok: false, text: "Lỗi mạng, thử lại nhé." });
    } finally {
      setBusy("");
    }
  }

  const live = f.mock === "0";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <a href="/admin" style={{ ...btn, textDecoration: "none", color: "#111" }}>← Về danh sách đơn</a>
        <strong style={{ fontSize: 20 }}>⚙️ Cài đặt</strong>
      </div>

      {!loaded && !msg && <div style={{ color: "#6b7280" }}>Đang tải...</div>}

      {loaded && (
        <>
          <div style={card}>
            <strong>Chế độ hoạt động</strong>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ ...btn, display: "flex", gap: 8, alignItems: "center", borderColor: !live ? "#2563eb" : "#d1d5db", background: !live ? "#eff6ff" : "#fff" }}>
                <input type="radio" checked={!live} onChange={() => set("mock", "1")} /> Chế độ thử (không gọi J&T thật)
              </label>
              <label style={{ ...btn, display: "flex", gap: 8, alignItems: "center", borderColor: live ? "#16a34a" : "#d1d5db", background: live ? "#f0fdf4" : "#fff" }}>
                <input type="radio" checked={live} onChange={() => set("mock", "0")} /> J&T thật
              </label>
            </div>
            {live && <div style={{ ...hint, color: "#b45309" }}>Khi bật J&T thật, bấm "Đẩy sang J&T" sẽ tạo vận đơn thật. Hãy chắc là đã điền đúng thông tin bên dưới và thử kết nối trước.</div>}
          </div>

          <div style={card}>
            <strong>Thông tin J&T (do J&T cấp cho bạn)</strong>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <span style={label}>Địa chỉ API của J&T</span>
                <input style={input} placeholder="https://..." value={f.jntApiBase} onChange={(e) => set("jntApiBase", e.target.value)} />
                <div style={hint}>Địa chỉ máy chủ J&T gửi cho bạn (bản thử hoặc bản chính thức), chỉ phần đầu, ví dụ https://abc.com/yuenan-interface-web</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={label}>Mã nguồn khách (eccompanyid)</span>
                  <input style={input} value={f.jntEccompanyid} onChange={(e) => set("jntEccompanyid", e.target.value)} />
                </div>
                <div>
                  <span style={label}>Mã khách hàng (customerid)</span>
                  <input style={input} value={f.jntCustomerid} onChange={(e) => set("jntCustomerid", e.target.value)} />
                </div>
              </div>
              <div>
                <span style={label}>Khóa bí mật (key)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={input}
                    type={showKey ? "text" : "password"}
                    placeholder={hasKey ? "Đã có khóa — để nguyên nếu không đổi" : "Dán khóa J&T vào đây"}
                    value={f.jntKey}
                    onFocus={() => { if (String(f.jntKey).startsWith("••••")) set("jntKey", ""); }}
                    onChange={(e) => set("jntKey", e.target.value)}
                  />
                  <button style={btn} onClick={() => setShowKey((v) => !v)}>{showKey ? "Ẩn" : "Hiện"}</button>
                </div>
                <div style={hint}>Khóa được lưu trong cơ sở dữ liệu của bạn, sau khi lưu chỉ hiện dấu sao.</div>
              </div>
            </div>
          </div>

          <div style={card}>
            <strong>Kho gửi hàng của shop</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div><span style={label}>Tên người gửi</span><input style={input} value={f.senderName} onChange={(e) => set("senderName", e.target.value)} /></div>
              <div><span style={label}>Số điện thoại</span><input style={input} value={f.senderPhone} onChange={(e) => set("senderPhone", e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}><span style={label}>Địa chỉ (số nhà, đường)</span><input style={input} value={f.senderAddress} onChange={(e) => set("senderAddress", e.target.value)} /></div>
              <div><span style={label}>Phường / Xã</span><input style={input} value={f.senderWard} onChange={(e) => set("senderWard", e.target.value)} /></div>
              <div><span style={label}>Quận / Huyện</span><input style={input} value={f.senderDistrict} onChange={(e) => set("senderDistrict", e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}><span style={label}>Tỉnh / Thành phố</span><input style={input} value={f.senderProvince} onChange={(e) => set("senderProvince", e.target.value)} /></div>
            </div>
          </div>

          <div style={card}>
            <div style={{ cursor: "pointer", fontWeight: 600 }} onClick={() => setShowAdv((v) => !v)}>{showAdv ? "▾" : "▸"} Nâng cao (chỉ sửa khi J&T yêu cầu)</div>
            {showAdv && (
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div><span style={label}>Đường dẫn tạo đơn</span><input style={input} placeholder="/order/orderAction!createOrder.action" value={f.pathCreate} onChange={(e) => set("pathCreate", e.target.value)} /></div>
                <div><span style={label}>Đường dẫn hủy đơn</span><input style={input} placeholder="/order/orderAction!updateOrder.action" value={f.pathCancel} onChange={(e) => set("pathCancel", e.target.value)} /></div>
                <div><span style={label}>Đường dẫn tra hành trình</span><input style={input} placeholder="/standart/trackAction!trackForJson.action" value={f.pathTrack} onChange={(e) => set("pathTrack", e.target.value)} /></div>
                <div style={hint}>Để trống thì dùng đường dẫn mặc định theo tài liệu J&T.</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnBlue} disabled={!!busy} onClick={save}>{busy === "save" ? "Đang lưu..." : "Lưu cài đặt"}</button>
            <button style={btn} disabled={!!busy} onClick={runTest}>{busy === "test" ? "Đang thử..." : "Thử kết nối J&T"}</button>
            <span style={{ fontSize: 14 }}>{msg}</span>
          </div>
          <div style={hint}>Bấm "Lưu cài đặt" trước, rồi mới bấm "Thử kết nối" (thử bằng thông tin đã lưu).</div>

          {test && (
            <div style={{ ...card, marginTop: 14, borderColor: test.ok ? "#bfdbfe" : "#fecaca", background: test.ok ? "#eff6ff" : "#fef2f2" }}>
              <strong>{test.ok ? "📨 J&T đã trả lời — đọc nội dung bên dưới" : "⚠️ Chưa ổn"}{test.status ? ` (mã ${test.status})` : ""}</strong>
              <div style={{ fontSize: 13, marginTop: 6, color: "#374151" }}>
                Mình gửi thử một yêu cầu tra hành trình với mã vận đơn giả (không tạo đơn gì). J&T trả lời:
              </div>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginTop: 8 }}>{test.text || test.error}</pre>
              <div style={hint}>Nếu J&T báo kiểu "không tìm thấy vận đơn" thì thông tin nhiều khả năng đã đúng (mã vận đơn thử là giả). Nếu báo sai chữ ký, sai khóa hoặc sai tài khoản thì kiểm tra lại các ô ở trên. J&T trả lời "ok" chưa có nghĩa là mọi thứ đúng, hãy đọc nội dung.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
