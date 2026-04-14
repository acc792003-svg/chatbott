create table public.shops (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique,
  slug text unique, -- For custom deeplinks (e.g., qlady)
  phone_number text,
  subscription_days integer default 0,
  expiry_date timestamp with time zone,
  plan text default 'free', -- 'free' or 'pro'
  plan_expiry_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Users (Linked to Auth and Shop)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  shop_id uuid references public.shops(id),
  role text default 'user', 
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chatbot Config
create table public.chatbot_configs (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade unique,
  shop_name text,
  product_info text,
  pricing_info text,
  faq text,
  is_active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Messages / History
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  session_id text, 
  user_message text,
  ai_response text,
  usage_tokens integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Usage tracking (for Free/Pro)
create table public.usage_stats (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  date date default current_date,
  message_count integer default 0,
  unique(shop_id, date)
);

-- RLS (Basic - for production you should refine this)
alter table public.shops enable row level security;
alter table public.users enable row level security;
alter table public.chatbot_configs enable row level security;
alter table public.messages enable row level security;
alter table public.usage_stats enable row level security;

-- Cài đặt hệ thống (API Keys, v.v.)
create table public.system_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bảng ghi log lỗi để Super Admin giám sát
create table public.error_logs (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  error_type text,
  error_message text,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.system_settings enable row level security;
alter table public.error_logs enable row level security;

-- Simple policy: Users can see their own shop data
create policy "Shops are viewable by everyone" on public.shops for select using (true);
create policy "Shops can be created by anyone" on public.shops for insert with check (true);
create policy "Shops can be updated by anyone" on public.shops for update using (true);

create policy "Users can insert their own profile" on public.users for insert with check (true);
create policy "Users see their own shop" on public.users for select using (true);
create policy "Users can update their own profile" on public.users for update using (true);

create policy "Users see their own chatbot_configs" on public.chatbot_configs for all using (true);
create policy "Enable insert for configs" on public.chatbot_configs for insert with check (true);
create policy "Users see their own messages" on public.messages for all using (true);
create policy "Enable insert for messages" on public.messages for insert with check (true);
create policy "System settings full access" on public.system_settings for all using (true);
create policy "Error logs full access" on public.error_logs for all using (true);
