# LUỒNG DỮ LIỆU TRI THỨC (DATA FLOW)

Tài liệu này giải thích cách dữ liệu đi từ **Xưởng Tri Thức** (Super Admin) xuống đến **Chatbot** của từng Shop.

---

## 1. Sơ đồ tổng quát
`Văn bản thô` -> `AI Xử lý (Gemini)` -> `Kiểm tra/Edit` -> `Lưu Database` -> `Chatbot sử dụng`

---

## 2. Chi tiết các bước và Bảng Database

### Bước 1: Thu thập & Nhập liệu
- Giao diện Admin thu thập `raw_content` và danh sách `shop_codes`.

### Bước 2: Xử lý AI (The "Kitchen")
- Hệ thống gửi nội dung lên API Google Gemini.
- AI phản hồi bằng JSON bao gồm: `product_info`, `faq`, `insights`.

### Bước 3: Lưu trữ & Xuất xưởng (Database)
Hệ thống thực hiện ghi dữ liệu vào 2 bảng chính:
1. **Bảng `knowledge_logs`**: Lưu nhật ký để Super Admin theo dõi.
2. **Bảng `chatbot_configs`**: Đây là nơi quan quan trọng nhất. 
   - Hệ thống dùng `shop_codes` để tìm ra `shop_id`.
   - Thực hiện lệnh `UPSERT` (Cập nhật nếu có, tạo mới nếu chưa có) dữ liệu tri thức vào cột `product_info`, `faq`, `customer_insights`, `brand_voice`.

### Bước 4: Chatbot truy vấn (Production)
Khi có khách nhắn tin:
1. AI Widget lấy `shop_id` từ mã nhúng.
2. Truy vấn bảng `chatbot_configs` lấy đúng dữ liệu tri thức sạch của shop đó.
3. Ghép vào System Prompt để trả lời khách hàng.

---

## 3. Các bảng cần lưu ý (Supabase)
| Tên bảng | Vai trò |
|----------|---------|
| `knowledge_templates` | Lưu các khung kiến thức mẫu theo ngành (Yến, Mỹ phẩm...) |
| `knowledge_logs` | Lưu lịch sử quá trình "nấu" tri thức của Admin. |
| `chatbot_configs` | **Kho chứa tri thức sạch cuối cùng**. Mọi tri thức chatbot dùng đều nằm ở đây. |
| `shops` | Dùng để tra cứu mối quan hệ giữa `code` (ví dụ 70WPN) và `shop_id` (UUID). |

---
*Tài liệu hướng dẫn vận hành hệ thống AI Chatbot SaaS.*
