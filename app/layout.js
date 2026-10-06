export const metadata = { title: "Web giao hàng", description: "Đẩy đơn sang hãng vận chuyển và theo dõi tình trạng" };
export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f5f7", color: "#111" }}>{children}</body>
    </html>
  );
}
