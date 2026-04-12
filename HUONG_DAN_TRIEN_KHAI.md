# Hướng Dẫn Triển Khai SaaS AI Chatbot

Chúc mừng bạn đã sở hữu bộ mã nguồn Chatbot AI cao cấp. Dưới đây là các bước để bạn đưa hệ thống này lên môi trường thực tế (Production).

## 1. Chuẩn bị Tài Khoản
Bạn cần có các tài khoản sau:
* **GitHub**: Để lưu trữ mã nguồn.
* **Supabase**: Để làm cơ sở dữ liệu và quản lý người dùng.
* **Google AI Studio**: Để lấy `GEMINI_API_KEY`.
* **Vercel**: Để triển khai (deploy) trang web.

---

## 2. Thiết lập Cấu Hình (Environment Variables)
Tạo file `.env.local` tại máy tính (cho việc chạy thử) và cấu hình trên Dashboard Vercel (cho việc triển khai) với các biến sau:

```env
NEXT_PUBLIC_SUPABASE_URL=URL_PROJECT_CUA_BAN
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_CUA_BAN
GEMINI_API_KEY=API_KEY_TU_GOOGLE_AI_STUDIO
```

---

## 3. Các Bước Kết Nối Chi Tiết

### Bước 1: Supabase (Database)
1. Truy cập [Supabase](https://supabase.com/).
2. Tạo Project mới.
3. Vào phần **SQL Editor**, copy toàn bộ nội dung trong file `supabase_schema.sql` của dự án và chạy (Run) để tạo các bảng dữ liệu.
4. Vào phần **Project Settings -> API** để lấy `URL` và `Anon Key` điền vào biến môi trường.

### Bước 2: Google Gemini (AI)
1. Truy cập [Google AI Studio](https://aistudio.google.com/).
2. Nhấn **Get API key**.
3. Tạo API Key mới và copy vào phần `GEMINI_API_KEY`.

### Bước 3: GitHub & Vercel (Deployment)
1. Đẩy code lên một Repository trên GitHub.
2. Truy cập [Vercel](https://vercel.com/).
3. Nhấn **Add New -> Project**, chọn Repo GitHub bạn vừa tạo.
4. Tại phần **Environment Variables**, điền đủ 3 biến đã chuẩn bị ở trên.
5. Nhấn **Deploy**. Sau 1-2 phút, trang web của bạn sẽ hoạt động tại domain của Vercel.

---

## 4. Cách sử dụng Dashboard
1. **Đăng nhập**: Sử dụng Supabase Auth (mặc định bạn có thể tạo tài khoản qua bảng `users`).
2. **Cấu hình**: Vào menu "Cấu hình Chatbot", điền thông tin Shop và Sản phẩm.
3. **Thử nghiệm**: Vào menu "Chat Demo" để trò chuyện trực tiếp với AI Gemini đã được huấn luyện theo dữ liệu shop của bạn.

---

## 5. Tích hợp Facebook Webhook (Nâng cao)
Để AI trả lời tin nhắn trên Fanpage:
1. Bạn cần tạo App trên [Meta for Developers](https://developers.facebook.com/).
2. Thiết lập Webhook trỏ về `https://domain-cua-ban.vercel.app/api/webhook`.
3. Khi có tin nhắn đến, Meta sẽ gửi dữ liệu về Webhook của bạn.

---
**Lưu ý**: Đây là bản MVP (Sản phẩm tối thiểu). Để triển khai chuyên nghiệp, bạn nên tùy chỉnh thêm phần bảo mật hàng đầu (RLS) trên Supabase.
