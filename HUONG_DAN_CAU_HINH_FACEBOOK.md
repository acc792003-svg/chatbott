# Hướng Dẫn Cấu Hình Facebook Messenger Cho Chatbot AI

Chào bạn! Dưới đây là hướng dẫn chi tiết từng bước để bạn kết nối Fanpage Facebook của mình vào hệ thống Chatbot AI.

## Bước 1: Chuẩn bị trên Meta for Developers
Bạn cần thiết lập một ứng dụng Facebook để làm "cầu nối" giữa Fanpage và hệ thống của bạn.

1.  Truy cập [Meta for Developers](https://developers.facebook.com/) và đăng nhập.
2.  **Tạo Ứng dụng mới**: Chọn loại ứng dụng "Khác" (Other) -> "Doanh nghiệp" (Business).
3.  **Thêm sản phẩm Messenger**: Trong giao diện quản lý App, tìm và nhấn **Set up** tại mục **Messenger**.
4.  **Kết nối Fanpage**:
    *   Vào mục **Messenger -> Instagram settings** (hoặc App Settings).
    *   Tại phần **Access Tokens**, nhấn **Add or Remove Pages** để chọn Fanpage bạn muốn tích hợp.
    *   Sau khi thêm, hãy copy **Page ID** và tạo một **Page Access Token**. Hãy lưu lại Token này.

## Bước 2: Cấu hình trên Dashboard Chatbot
Bây giờ bạn đưa các thông tin vừa lấy được vào hệ thống quản trị của mình.

1.  Đăng nhập vào hệ thống Chatbot của bạn.
2.  Vào menu **Cấu hình Chatbot** (thường ở đường dẫn `/dashboard/config`).
3.  Tìm đến phần **Facebook Messenger Integration**.
4.  Điền các thông tin:
    *   **Page ID**: Dán ID Fanpage của bạn vào đây.
    *   **Page Access Token**: Dán đoạn mã Token (bắt đầu bằng `EA...`) bạn vừa lấy ở Bước 1.
5.  Nhấn **XÁC NHẬN LƯU CẤU HÌNH**.

## Bước 3: Cấu hình Webhook (Kết nối ngược lại)
Để Facebook biết phải gửi tin nhắn về đâu khi khách hàng chat.

1.  Quay lại trang quản lý App trên Meta for Developers.
2.  Vào mục **Messenger -> Settings** -> Tìm phần **Webhooks**.
3.  Nhấn **Configure** (hoặc Edit Subscription):
    *   **Callback URL**: Điền link webhook chính thức của bạn (Ví dụ: `https://ten-mien-cua-ban.com/api/facebook/webhook`).
    *   **Verify Token**: Hiện tại bạn hãy nhập là: `TOKENDUNGQUYNHTHANH`
4.  Nhấn **Verify and Save**.
5.  **Quan trọng - Nhận tin nhắn**: Tại mục **Webhooks**, nhấn **Manage** và tích chọn (Subscribe) các quyền sau:
    *   `messages`
    *   `messaging_postbacks`
6.  Nhấn **Done**.
7.  **Lưu ý quan trọng về Page ID**: ID Fanpage phải là một chuỗi số (ví dụ: `10423984234...`), không phải là tên hiển thị hay đường dẫn (slug) của Fanpage. Bạn có thể lấy ID này trong phần **Giới thiệu (About)** của Fanpage hoặc trong URL khi chỉnh sửa trang.

## Bước 4: Kiểm tra (Test)
*   Dùng một tài khoản Facebook khác (không phải admin Page) nhắn tin vào Fanpage.
*   Nếu AI phản hồi ngay lập tức theo đúng kịch bản bạn đã huấn luyện trong phần FAQ, chúc mừng bạn đã cấu hình thành công!

---
> [!TIP]
> **Lưu ý về quyền hạn**: Khi ở chế độ "Development", chỉ những người có vai trò trong App (Admin/Tester) mới nhận được câu trả lời từ AI. Để trả lời cho khách hàng vãng lai, bạn cần chuyển App sang chế độ **Live** hoặc gửi xét duyệt App lên Facebook (quyền `pages_messaging`).

Nếu bạn gặp lỗi hay cần hỗ trợ gì thêm, hãy cứ hỏi mình nhé! 🚀
