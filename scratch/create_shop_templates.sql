-- CREATE THE SHOP_TEMPLATES TABLE IF NOT EXISTS --
CREATE TABLE IF NOT EXISTS shop_templates (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references shops(id) on delete cascade not null,
  template_id uuid references knowledge_templates(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (shop_id, template_id)
);

ALTER TABLE shop_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép Service Role Backend quản lý shop_templates" ON shop_templates;
CREATE POLICY "Cho phép Service Role Backend quản lý shop_templates" ON shop_templates FOR ALL USING (true) WITH CHECK (true);
