# QUY CHUẨN KIẾN TRÚC & BEST PRACTICES (Next.js + Supabase)

Tài liệu này lưu trữ các nguyên tắc sống còn khi phát triển các hệ thống trên nền tảng SaaS (đặc biệt là tính năng Booking Đặt lịch & AI Chatbot). Tuyệt đối tuân thủ để tránh lỗi diện rộng.

## 1. QUY TẮC VÀNG VỀ MÚI GIỜ (TIMEZONE) - SÁT THỦ THẦM LẶNG

**AI sai còn sửa được. Timezone sai → Hệ thống chết âm thầm.**

- **NGUYÊN TẮC:** Database lưu chuẩn `UTC` – Giao diện UI hiển thị theo chuẩn Local (Ví dụ: `Asia/Ho_Chi_Minh`).
- **SCHEMA:** Tuyệt đối dùng `TIMESTAMPTZ` (Timestamp With Time Zone) trong Supabase cho ngày giờ (không dùng `TIMESTAMP` thường).

### ✅ Cách làm chuẩn khi Code (Sử dụng `date-fns-tz`)
❌ **Sai lầm nguy hiểm:** Khởi tạo Date mặc định mà không kèm Timezone:
```js
const time = new Date("2026-04-24 14:00"); // Tại server sẽ bị hiểu nhầm timezone!
```

✅ **Đúng:** Luôn ép về ISO UTC trước khi đẩy vào CSDL:
```javascript
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

// 1. CHUẨN BỊ LƯU DATA (Local -> UTC)
const utcDate = zonedTimeToUtc("2026-04-24 14:00", "Asia/Ho_Chi_Minh");
await supabase.from("bookings").insert({ booking_time: utcDate.toISOString() });

// 2. LẤY RA HIỂN THỊ / XỬ LÝ (UTC -> Local)
const localDate = utcToZonedTime(bookingTimeFromDB, "Asia/Ho_Chi_Minh");
const gioThucTe = localDate.getHours();
```

✅ **Luôn nhớ lưu Timezone cho từng Shop:**
Hệ thống Multi-tenant cần biến `shop_settings.timezone = 'Asia/Ho_Chi_Minh'` để phục vụ khách quốc tế sau này.

---

## 2. QUY CHUẨN XỬ LÝ AI FUNCTION CALLING (BOOKING)

- ❌ **Không để AI:** Tự tính toán số lượng slot, tự tính giảm giá, quyết định logic.
- ✅ **AI chỉ làm nhiệm vụ:** Đóng vai trò phễu giao tiếp, sinh câu từ tự nhiên & chốt sale dựa trên `Context` Backend đút cho.

### Flow Luồng Đặt Lịch Chuẩn:
1. **User hỏi giờ**
2. **AI nhận diện intention** -> Ngắt sinh chữ, xin gọi Tool `check_booking_availability(time, service)`
3. **Backend Node.js**:
   - Check Overlap time từ Supabase (Đếm booking so với Slot Max).
   - Check Khung giờ KM (Dựa trên `discount_rules`).
   - Trả JSON Context cho AI (`available: true, usage_percent: 80, discount: 20%`)
4. **AI bắt đầu nói lại (Prompt kích thích):** *"Dạ chị ơi khung 14h đang giảm 20% mà bên em sắp kín lịch rồi, chị giữ chỗ sớm giúp em ạ!"*

### Chống Race Condition:
- Luôn phải Double-Check (`if (!slot.available)`) ở hàm `insert` cuối cùng. Nếu khách chat chốt chậm, slot có thể đã bị giành mất. Phải chặn lỗi từ hàm chốt này thay vì tin tưởng 100% vào ngữ cảnh lúc AI đang tư vấn.
