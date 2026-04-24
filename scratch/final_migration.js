const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function finalMigration() {
  console.log('🚀 Starting Final Smart Hub Migration...');
  
  // Note: We'll attempt to add all necessary columns for the advanced tracking
  // In a real environment, you'd run this in the Supabase SQL Editor.
  const sql = `
    -- 1. Thêm các cột theo dõi sức khỏe và hiệu suất
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS fail_count int DEFAULT 0;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS success_count int DEFAULT 0;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS usage_count int DEFAULT 0;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cooldown_until timestamp with time zone;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS last_error text;

    -- 2. Đảm bảo các Key DeepSeek đã tồn tại
    INSERT INTO system_settings (key, value)
    VALUES 
      ('deepseek_api_key_free1', 'DeepSeek free1'),
      ('deepseek_api_key_free2', 'DeepSeek free2'),
      ('deepseek_api_key_pro', 'DeepSeek pro')
    ON CONFLICT (key) DO NOTHING;

    -- 3. Tạo index để query nhanh hơn
    CREATE INDEX IF NOT EXISTS idx_settings_health ON system_settings(status, cooldown_until);
  `;

  console.log('✅ Migration plan ready.');
  console.log('Lưu ý: Bạn nên copy đoạn SQL trên và chạy trong Supabase SQL Editor để đảm bảo 100% thành công.');
  console.log('Tôi sẽ tiếp tục triển khai phần code xử lý thông minh...');
}

finalMigration();
