# HƯỚNG DẪN TỐI ƯU HÓA CẤU HÌNH AI & XƯỞNG TRI THỨC (DÀNH CHO CHỦ SHOP & ADMIN)

Tài liệu này tổng hợp các "Tuyệt chiêu" thiết lập cấu hình và dữ liệu mớm cho Chatbot, giúp hệ thống **Phản hồi ngay lập tức (Real-time)**, **Chính xác 100% không bịa chuyện (No Hallucination)** và **Tiết kiệm tới 90% chi phí API Key**.

---

## 🌟 PHẦN 1: QUY TẮC VÀNG CHO "CẤU HÌNH AI" (BẢNG THÔNG TIN CƠ BẢN)
*Đây là bộ nhớ NGẮN HẠN nhưng TỐI CAO của AI. Nội dung ở đây AI sẽ ưu tiên đọc trước nhất khi đưa ra quyết định.*

### 1. Nguyên tắc "Ngắn Gọn & Gạch Đầu Dòng" (Bullet points)
Tuyệt đối **KHÔNG** copy toàn bộ bài viết PR, văn xuôi, hay status Facebook dài dòng vứt vào đây. Cứ viết dài thì AI càng bị loạn và đọc lâu.
*   **Tổng độ dài khuyến nghị:** Dưới 500 ký tự.

**❌ Cấu hình SAI (Chậm, Dễ nhầm, Tốn Token):**
> "Chào mừng bạn đến với Mộc Lam Spa - Nơi xua tan mọi căng thẳng mệt mỏi! Chúng tôi chuyên cung cấp các dịch vụ gội đầu dưỡng sinh bằng thảo mộc tự nhiên 100% giúp tóc chắc khỏe..."

**✅ Cấu hình CHUẨN (AI đọc trong 1/100 giây):**
> Loại hình: Mộc Lam Spa – Chuyên gội đầu dưỡng sinh.
> Giá dịch vụ: 
> - Cơ bản: 199k (45p)
> - VIP: 299k (VIP 60p + massage combo)
> Địa chỉ: 123 Nam Kỳ Khởi Nghĩa, Quận 1.
> Ưu đãi hiện tại: Đi 2 giảm 10%, mã giảm giá FREESHIP.

---

## 🌟 PHẦN 2: "HACK" HIT-RATE TRÊN XƯỞNG TRI THỨC (FAQ VECTOR)
*Xưởng tri thức hoạt động theo cơ chế Nhúng ngữ nghĩa (Vector Embeddings). Điểm chạm (Similarity Score) càng cao, Chatbot trả lời KHÔNG CẦN CHỜ AI.*

### Cơ chế 3 Mức độ trả lời:
*   **Mức 1 (Khớp ≥ 89%):** Chatbot trả lời thẳng văn bản mớm sẵn (Tốc độ ánh sáng, Không tốn token).
*   **Mức 2 (Khớp 80% - 89%):** Chatbot gom câu hỏi gửi qua AI để tự nắn nót lại diễn đạt.
*   **Mức 3 (Khớp < 80%):** Bỏ qua FAQ, chỉ dùng Cấu Hình AI để tự suy luận (Tránh làm nhiễu AI bằng FAQ không liên quan).

### 💡 TUYỆT CHIÊU: Viết 1 Hỏi - Trả Lời trúng 5 Câu!
Để đẩy nhanh xác suất vọt lên **≥ 89%**, hãy gộp các loại biến thể khách hay hỏi vào chung trong phần *Câu hỏi* của 1 Q&A.

**❌ Chậm - Thay vì tách làm 3 câu riêng biệt như:**
- "Giá bao nhiêu?" -> Trả lời A
- "Dịch vụ giá thế nào?" -> Trả lời A
- "Xin báo giá?" -> Trả lời A

**✅ Tăng Hit-rate cực mạnh:**
- **Câu hỏi:** "Giá bao nhiêu / bao nhiêu tiền / chi phí thế nào / báo giá / bảng giá dịch vụ"
- **Câu trả lời:** "Dạ hiện tại bên mình đang có các gói dịch vụ:\n- Gói Cơ bản: 199k (45 phút)\n- Gói VIP: 299k (60 phút + massage).\nBạn đang quan tâm gói nào ạ?"

*(Tương tự cho các câu hỏi về: Vận chuyển, Thời gian làm việc, Đổi trả... Cứ liệt kê cụm từ đồng nghĩa ngăn cách nhau bằng dấu gạch chéo `/`).*

---

## 🌟 PHẦN 3: TRIẾT LÝ TĂNG CHẠM KHÁCH HÀNG
Khi cài đặt câu trả lời ở Xưởng Tri Thức:

1. **Luôn chứa câu hỏi mở ở cuối:** Đừng bao giờ trả lời cụt lủn. (Ví dụ: Thay vì "Bên mình ship toàn quốc 30k" -> Đổi thành "Bên mình ship toàn quốc đồng giá 30k ạ. Mình gửi về tỉnh thành nào vậy bạn ha?")
2. **Kêu gọi hành động nhẹ nhàng:** Luôn hướng khách hàng về chốt Sale/Thu thập thông tin thay vì chỉ phản hồi như 1 cỗ máy.
