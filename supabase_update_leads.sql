-- 1. Tạo bảng Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  session_id text, -- ID phiên chat để xem lại context
  phone text NOT NULL,
  customer_name text,
  first_message text, -- Tin nhắn đầu tiên chứa SĐT
  status text DEFAULT 'new', -- new | contacted | done
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Thêm cột cấu hình Telegram vào bảng chatbot_configs
ALTER TABLE public.chatbot_configs 
ADD COLUMN IF NOT EXISTS telegram_chat_id text,
ADD COLUMN IF NOT EXISTS telegram_bot_token text; -- Cho phép dùng bot riêng nếu muốn

-- 3. Bật RLS cho bảng leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 4. Tạo Policy cho bảng leads
CREATE POLICY "Users can see leads of their shop" ON public.leads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.shop_id = leads.shop_id
  )
);

CREATE POLICY "Enable insert for everyone (anon)" ON public.leads
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leads of their shop" ON public.leads
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.shop_id = leads.shop_id
  )
);
