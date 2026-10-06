# Web giao hàng (web trung gian)

Nhận đơn từ web bot chat → bạn kiểm tra/sửa → đẩy sang J&T → theo dõi tình trạng → báo ngược về web bot chat.

## Đang ở CHẾ ĐỘ THỬ
Mặc định `CARRIER_MOCK=1`: web chạy đủ luồng nhưng KHÔNG gọi J&T thật, mã vận đơn là giả
và tình trạng tự nhích (1 phút lấy hàng, 3 phút đang giao, 6 phút đã giao).
Khi có tài khoản J&T: điền các biến JNT_* rồi đổi `CARRIER_MOCK` thành `0`.

## Cài lên Vercel (giống web bot chat)
1. Upload toàn bộ nội dung thư mục này lên một repo GitHub mới.
2. Vercel → Add New → Project → chọn repo → trước khi Deploy, thêm Neon (Storage) và các biến bên dưới.

## Biến môi trường (Vercel → Settings → Environment Variables)
- ADMIN_USER, ADMIN_PASSWORD — đăng nhập trang quản trị
- SHARED_SECRET — chuỗi bí mật tự đặt (dài), DÙNG CHUNG với web bot chat
- BOT_WEB_URL — địa chỉ web bot chat, ví dụ https://bot-fb.vercel.app
- CARRIER_MOCK — 1 (thử) hoặc 0 (J&T thật)
- JNT_API_BASE, JNT_ECCOMPANYID, JNT_CUSTOMERID, JNT_KEY — J&T cấp cho bạn
- SENDER_NAME, SENDER_PHONE, SENDER_ADDRESS, SENDER_WARD, SENDER_DISTRICT, SENDER_PROVINCE — kho gửi hàng

## Cập nhật tình trạng tự động
- Đang mở trang quản trị: tự hỏi hãng mỗi 90 giây.
- Vercel gói miễn phí chỉ chạy tự động 1 lần/ngày. Muốn nhanh hơn khi không mở trang: dùng dịch vụ miễn phí
  như cron-job.org, đặt gọi địa chỉ `https://TEN-WEB/api/cron/sync?key=SHARED_SECRET` mỗi 10–15 phút.

## Web bot chat gửi đơn sang đây thế nào
POST https://TEN-WEB/api/inbound/orders
Header: x-shared-secret: <SHARED_SECRET>
Body: { "source": "bot", "sourceOrderId": "123",
        "order": { "customerName", "phone", "address", "productName", "variant", "quantity", "unitPrice", "shipFee", "note" } }

## Web này báo ngược về web bot chat thế nào
POST <BOT_WEB_URL>/api/orders/status-hook
Header: x-shared-secret: <SHARED_SECRET>
Body: { "orderId", "status": "draft|shipped|delivered|returned", "statusDetail", "statusText", "billCode", "carrier" }
(Phía web bot chat cần thêm đường này — chưa làm.)

## Lưu ý về J&T
Phần nối J&T (lib/carriers/jnt.js) viết theo tài liệu công khai của J&T nhưng CHƯA thử với tài khoản thật.
Các chỗ đánh dấu [KIỂM TRA] là tên trường/đường dẫn cần đối chiếu với tài liệu J&T gửi bạn.
