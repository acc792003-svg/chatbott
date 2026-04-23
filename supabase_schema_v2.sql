-- ==========================================================
-- SUPABASE SCHEMA V2 - PRODUCTION READY
-- ==========================================================

-- 0. Enable Vector Extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Bảng tri thức AI (FAQs)
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  embedding vector(3072), -- Phù hợp với Gemini/OpenAI embeddings
  intent text,
  type text DEFAULT 'info', -- 'info', 'sales', 'policy', etc.
  created_at timestamp with time zone DEFAULT now()
);

-- Bổ sung ngay nếu bảng đã tồn tại:
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';

CREATE INDEX IF NOT EXISTS idx_faqs_shop_id ON faqs(shop_id);

-- 2. Bảng Bộ nhớ đệm câu trả lời (Cache Answers)
CREATE TABLE IF NOT EXISTS cache_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_shop ON cache_answers(shop_id);

-- 3. Nhật ký vận hành (Chat Logs) để Debug & Monitor
CREATE TABLE IF NOT EXISTS chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  user_input text,
  answer text,
  source text, -- 'faq', 'cache', 'ai'
  latency_ms integer, -- Đo hiệu suất hệ thống
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Quản lý hội thoại đa nền tảng (Conversations)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  platform text DEFAULT 'widget', -- 'widget', 'facebook', 'zalo'
  external_user_id text, -- PSID của Facebook hoặc ID nặc danh của Widget
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_shop ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conv_external_id ON conversations(external_user_id);

-- 5. Cập nhật bảng tin nhắn (Messages)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'widget',
ADD COLUMN IF NOT EXISTS external_user_id text;

-- 6. Nâng cấp bảng Khách hàng (Leads)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS telegram_status text DEFAULT 'pending', -- 'pending', 'success', 'failed', 'duplicate'
ADD COLUMN IF NOT EXISTS telegram_error text,
ADD COLUMN IF NOT EXISTS telegram_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new'; -- 'new', 'contacted', 'done'

-- Index hỗ trợ check trùng lead nhanh
CREATE INDEX IF NOT EXISTS idx_lead_phone_shop ON leads(shop_id, phone);

-- 7. Cấu hình hệ thống (System Settings)
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. Tối ưu Facebook Routing cho shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS fb_page_id text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS fb_page_token text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS manychat_api_key text;
CREATE INDEX IF NOT EXISTS idx_fb_page_id ON shops(fb_page_id);
CREATE INDEX IF NOT EXISTS idx_manychat_key ON shops(manychat_api_key);

ALTER TABLE chatbot_configs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 9. Hàm tìm kiếm Vector Similarity (Linh hồn của Hybrid Search)
-- Hàm này tìm các câu hỏi có nghĩa tương đồng nhất với câu hỏi của khách
CREATE OR REPLACE FUNCTION match_faqs (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  p_shop_id uuid
)
returns table (
  id uuid,
  question text,
  answer text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    faqs.id,
    faqs.question,
    faqs.answer,
    1 - (faqs.embedding <=> query_embedding) as similarity
  from faqs
  where faqs.shop_id = p_shop_id
    and 1 - (faqs.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- ==========================================================
-- BẢN SCHEMA NÀY ĐÃ SẴN SÀNG CHO SCALE 1000+ USER
-- ==========================================================

-- 10. HỆ THỐNG ĐẶT LỊCH (BOOKING SYSTEM) & ƯU ĐÃI
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_id uuid PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  slot_duration_minutes integer DEFAULT 60,
  max_slot_per_block integer DEFAULT 3,
  working_start time DEFAULT '08:00',
  working_end time DEFAULT '20:00',
  timezone text DEFAULT 'Asia/Ho_Chi_Minh',
  slot_interval_minutes integer DEFAULT 60,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  discount_type text DEFAULT 'percent', -- 'percent' hoặc 'fixed'
  discount_value integer NOT NULL,
  apply_days text[] DEFAULT '{"mon","tue","wed","thu","fri","sat","sun"}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  service_name text NOT NULL,
  booking_time timestamp with time zone NOT NULL,
  booking_end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'new', -- 'new', 'confirmed', 'cancel'
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_shop_time ON bookings(shop_id, booking_time);

-- 11. KÍCH HOẠT VÀ TẠO CHÍNH SÁCH RLS (BẢO MẬT DỮ LIỆU)
-- Tránh cảnh báo "Without RLS" của Supabase

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Chỉ Service Role (Backend API có chứa khóa service_role_key) mới có toàn quyền
-- Client App (Anon key) sẽ không thể Query hay Chỉnh sửa trực tiếp từ Frontend
DROP POLICY IF EXISTS "Cho phép Backend Server xử lý tất cả bảng faqs" ON faqs;
CREATE POLICY "Cho phép Backend Server xử lý tất cả bảng faqs" ON faqs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý cache_answers" ON cache_answers;
CREATE POLICY "Cho phép Backend Server xử lý cache_answers" ON cache_answers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý chat_logs" ON chat_logs;
CREATE POLICY "Cho phép Backend Server xử lý chat_logs" ON chat_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý conversations" ON conversations;
CREATE POLICY "Cho phép Backend Server xử lý conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend đọc system_settings" ON system_settings;
CREATE POLICY "Cho phép Backend đọc system_settings" ON system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý shop_settings" ON shop_settings;
CREATE POLICY "Cho phép Backend Server xử lý shop_settings" ON shop_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý discount_rules" ON discount_rules;
CREATE POLICY "Cho phép Backend Server xử lý discount_rules" ON discount_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép Backend Server xử lý bookings" ON bookings;
CREATE POLICY "Cho phép Backend Server xử lý bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- (MẸO: Để Supabase Node JS Client nhận diện bảng mới ngay lập tức)
NOTIFY pgrst, 'reload schema';
