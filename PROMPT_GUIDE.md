# HƯỚNG DẪN TỐI ƯU HÓA CẤU HÌNH AI & XƯỞNG TRI THỨC (DÀNH CHO CHỦ SHOP & ADMIN)

Tài liệu này tổng hợp các "Tuyệt chiêu" thiết lập cấu hình và dữ liệu mớm cho Chatbot, giúp hệ thống **Phản hồi ngay lập tức (Real-time)**, **Chính xác 100% không bịa chuyện (No Hallucination)** và **Tiết kiệm tới 90% chi phí API Key**.

---

## 🌟 PHẦN 1: TỐI ƯU MÀN HÌNH "CẤU HÌNH SHOP" (AI CONFIG)
*Đây là bộ nhớ NGẮN HẠN nhưng TỐI CAO của AI. Nội dung ở đây AI sẽ ưu tiên đọc trước nhất khi đưa ra quyết định.*

### Nguyên tắc "Gạch Đầu Dòng" (Bullet points) - Dưới 500 ký tự
Tuyệt đối **KHÔNG** copy toàn bộ bài viết PR, văn xuôi, hay status Facebook dài dòng vứt vào đây. Cứ viết dài thì AI càng bị loạn, đọc lâu và ngốn tiền.

**❌ Ví dụ NHẬP SAI (Dễ nhầm, Tốn Token):**
> Chào mừng bạn đến với Mộc Lam Spa - Nơi xua tan mọi căng thẳng mệt mỏi! Chúng tôi mang lại dịch vụ gội đầu dưỡng sinh bằng thảo mộc tự nhiên 100% giúp tóc chắc khỏe...

**✅ VÍ DỤ NHẬP CHUẨN TRÊN GIAO DIỆN CẤU HÌNH:**

**1. Ô [Thông tin SP/Dịch vụ]:**
```text
- Là Mộc Lam Spa – Chuyên gội đầu dưỡng sinh Đông Y.
- Địa chỉ: 123 Nam Kỳ Khởi Nghĩa, Quận 1, HCM.
- Thời gian hoạt động: 8h00 - 22h00 (Kể cả lễ Tết).
- SĐT Hotline: 0909.123.456
```

**2. Ô [Thông tin Giá Cả]:**
```text
- Gói Cơ bản (45 phút): 199k
- Gói VIP (60 phút + massage cổ vai gáy): 299k
- Combo Thanh Xuân (90 phút + gội + massage + tắm thảo dược): 499k
- Phí phụ thu cuối tuần: Không có.
```

**3. Ô [Chiến lược Bán hàng / Customer Insight]:**
```text
- Nếu khách rủ bạn bè, hãy nhắc gói ưu đãi "Đi 2 giảm 10%".
- Luôn xin SĐT khách hàng trước khi chào tạm biệt để chốt lịch hẹn.
```

**4. Ô [Giọng điệu (Brand Voice)]:**
```text
Nhẹ nhàng, lễ phép, gọi dạ bảo vâng, xưng "Mộc Lam" và gọi khách là "chị/anh".
```

---

## 🌟 PHẦN 2: "HACK" HIT-RATE Ở MÀN HÌNH "XƯỞNG TRI THỨC" (FAQ VECTOR)
*Xưởng tri thức hoạt động theo cơ chế Nhúng ngữ nghĩa. Nếu câu khách hỏi Khớp ≥ 89% với Q&A trong Xưởng, Chatbot sẽ trả lời ngay KHÔNG CẦN chọc vào AI.*

### 💡 TUYỆT CHIÊU: Viết 1 Hỏi - Trả Lời trúng 5 Câu!
Khi bấm nút **Thêm Tri thức (Thêm Câu hỏi/Trả lời)**, hãy gộp ngầm các loại biến thể khách hay hỏi vào chung một ô Câu Hỏi. Cứ mỗi cụm đồng nghĩa, hãy ngăn cách bằng dấu `/`.

**❌ Ví dụ NHẬP SAI (Tách lắt nhắt làm 3 bài Q&A riêng):**
- Q&A 1: "Giá bao nhiêu?" -> Trả lời A
- Q&A 2: "Dịch vụ giá thế nào?" -> Trả lời A
- Q&A 3: "Xin báo giá?" -> Trả lời A

**✅ VÍ DỤ NHẬP CHUẨN TRÊN GIAO DIỆN XƯỞNG TRI THỨC:**

**Ví dụ 1: Điểm chạm về Giá**
*   **Ô [Câu hỏi khách hàng]:**
    `Giá bao nhiêu / bao nhiêu tiền / chi phí thế nào / báo giá / bảng giá dịch vụ`
*   **Ô [Câu trả lời của AI]:**
    `Dạ hiện tại Mộc Lam có 3 mức giá cho chị tham khảo ạ: Gói cơ bản 199k, Gói VIP 299k và Combo 499k. Không biết dạo này chị đang bị đau mỏi hay chỉ muốn gội xả bớt stress thôi ạ?`

**Ví dụ 2: Điểm chạm về Vị trí**
*   **Ô [Câu hỏi khách hàng]:**
    `Shop ở đâu / địa chỉ / đường nào / xin vị trí / chi nhánh`
*   **Ô [Câu trả lời của AI]:**
    `Dạ Mộc Lam Spa nằm ở 123 Nam Kỳ Khởi Nghĩa, Q1 (Ngay ngã tư quẹo phải, đối diện Highland Coffee) nha chị! Chị định ghé vào hôm nay hay cuối tuần ạ, để Mộc Lam xem giờ trống chuẩn bị trà ngon đón chị nha?`

> **🔑 Tư duy chốt Sale trong Xưởng:** Nhìn vào các phần **[Câu trả lời]** ở trên, tuyệt đối đừng trả lời cụt lủn. Luôn kết thúc bằng một câu hỏi (Open question) để kích thích khách trả lời, dẫn dắt đưa họ vào phễu xin SĐT.

---

## 🌟 PHẦN 3: 💸 BÍ KÍP NHẬP LIỆU THỰC TẾ GIÚP BẠN TIẾT KIỆM 90% CHI PHÍ AI (Ví dụ từ QLady Spa)
*(Đọc kỹ ví dụ "Mổ xẻ" sai lầm kinh điển từ một shop thực tế dưới đây để tránh mất tiền oan và giúp AI phản hồi cực thông minh).*

### KHUNG CẢNH: Shop đang điền lung tung khiến AI bị "loạn", trả lời chậm và ngốn tiền.
Dưới đây là một ví dụ ĐANG BỊ NHẬP SAI:
*   **❌ Bị sai ở Ô [Thông tin chung]:** Điền 1 đoạn văn lộn xộn vừa địa chỉ, số điện thoại, vừa liệt kê 10 dòng giá gội đầu, cấy collagen rối rắm. Thậm chí không dùng dấu gạch đầu dòng.
*   **❌ Bị sai ở Ô [Thông tin Giá]:** Bỏ trống (Null). Bắt AI phải tự đi tìm giá trong mớ bòng bong ở ô Thông tin chung.
*   **❌ Bị sai ở Ô [Chiến lược Bán hàng]:** Soạn nguyên 1 bài kịch bản MC văn mẫu học thuộc lòng *(VD: "Nếu khách hỏi A thì bạn bảo B, nếu khách nói C thì bạn tư vấn D...")*. Điều này giết chết sự tự nhiên của AI và tốn nghìn Token chỉ để đọc văn mẫu của bạn!

---

### 👑 CÁCH NHẬP LẠI CHUẨN "ĐIỂM 10" (Dành cho Chủ Shop):
> Rút kinh nghiệm, bạn hãy xóa sạch những gì không cần thiết và nhập liệu vào các Ô tương ứng y hệt định dạng dưới đây. Tôn chỉ: **Gắn gọn - Gạch đầu dòng - Chuyển tư duy thành Mệnh lệnh (Không viết văn xuôi).**

👉 **Ô Giao diện 1: [Thông tin chung]**
*(Chỉ giới thiệu danh tính, cơ sở vật chất, liên hệ)*
```text
- Tên thương hiệu: QLady Spa - Chuyên Massage và Gội đầu dưỡng sinh thư giãn.
- Địa chỉ: 41A Quang Trung, Nha Trang, Khánh Hòa.
- Hotline/Zalo ghi danh: 0905.186.601
```

👉 **Ô Giao diện 2: [Thông tin Giá Cả]**
*(Tách riêng giá khỏi thông tin chung, nhóm cụ thể ra để AI nhìn lướt qua là thấy ngay)*
```text
[NHÓM GỘI ĐẦU DƯỠNG SINH]:
- Cơ bản: 59k / 79k / 129k / 209k.
- Combo Thư giãn (Relax/Tinh dầu): 209k / 299k.
- Combo Đá nóng: 330k.

[NHÓM CHĂM SÓC DA]:
- Lấy nhân mụn: 150k.
- Chăm sóc mặt: Cơ bản (250k), Chuyên sâu (350k), Royal cao cấp (500k).
- Cấy dưỡng chất (HA / Collagen): Căng bóng 600k / Chống lão hóa 350k.
```

👉 **Ô Giao diện 3: [Chiến lược Bán hàng]**
*(Biến 1 bài văn mẫu thành các "Luật lệ thép" ép AI phải tuần thủ. Không viết dài).*
```text
- LUẬT 1: Khi khách hỏi giá, bạn báo giá xong BẮT BUỘC phải hỏi tiếp câu mở: "Chị thích làm vào khung buổi sáng hay chiều để em chuẩn bị?" nhằm kéo dài cuộc trò chuyện.
- LUẬT 2: Nếu khách còn do dự, hãy chủ động đề xuất "tạm giữ chỗ" giúp khách để tạo sự an tâm.
- LUẬT CHỐT SALE: Khi khách có ý định đặt khung giờ -> BẮT BUỘC xin lại Tên và Số điện thoại trước khi kết thúc.
- LUẬT BIỂU CẢM: Ưu tiên dùng các icon dễ thương (😊, 🌿, 💆‍♀️) cho thân thiện.
```

👉 **Ô Giao diện 4: [Giọng điệu Chatbot]**
```text
Lễ phép, ấm áp, nhiệt tình dạ thưa. Xưng "em" và gọi khách là "chị/anh".
```

> **📌 KẾT LUẬN CUỐI CÙNG CHO CHỦ SHOP:**
> Cách thiết lập như bức tranh thứ 2 (✅) không tốn của bạn tới 2 phút, nhưng nó giúp AI của bạn trở thành 1 cỗ máy bán hàng xuất sắc: Lấy Data nhanh trong `0.5s` (Tốc độ Real-time), Khả năng nhớ Giá hoàn hảo và đặc biệt — **Tài khoản của bạn sẽ không bao giờ cạn hạn mức Token trước cuối tháng!**


