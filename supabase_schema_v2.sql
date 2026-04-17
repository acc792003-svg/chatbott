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
  embedding vector(768), -- Phù hợp với Gemini/OpenAI embeddings
  intent text,
  created_at timestamp with time zone DEFAULT now()
);

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

-- 8. Tối ưu Facebook Routing cho chatbot_configs
CREATE INDEX IF NOT EXISTS idx_fb_page_id ON chatbot_configs(fb_page_id);

ALTER TABLE chatbot_configs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 9. Hàm tìm kiếm Vector Similarity (Linh hồn của Hybrid Search)
-- Hàm này tìm các câu hỏi có nghĩa tương đồng nhất với câu hỏi của khách
CREATE OR REPLACE FUNCTION match_faqs (
  query_embedding vector(768),
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
