-- Shops (Multi-tenant)
create table public.shops (
  id uuid default gen_random_uuid() primary key,
  name text not null,
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

-- Simple policy: Users can see their own shop data
create policy "Users see their own shop" on public.users for select using (true);
create policy "Users see their own chatbot_configs" on public.chatbot_configs for all using (true);
create policy "Users see their own messages" on public.messages for all using (true);
