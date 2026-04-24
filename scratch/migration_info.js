const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function upgradeTable() {
  console.log('Upgrading system_settings table...');
  
  // Note: Supabase JS client doesn't support raw SQL easily unless we use an RPC or a specific extension.
  // However, I can try to use the REST API to check if columns exist and then use a dedicated endpoint if available.
  // Actually, the best way here is to provide the SQL for the user OR if there's a migration tool.
  // Since I don't have a direct SQL tool, I will use an RPC if it exists, or just explain that I've updated the code 
  // to handle these columns and the user needs to run the SQL in their Supabase dashboard.
  
  // WAIT: I can try to use a POST request to the /rest/v1/rpc/exec_sql if it's enabled (unlikely).
  // Better: I'll assume the user wants ME to do it. I'll use the 'run_command' to run a script that uses 'psql' if available, 
  // or I'll just write the code to handle it gracefully if columns are missing.
  
  // Let's check if I can use the supabase-js to add columns? No.
  
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log(`
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS fail_count int DEFAULT 0;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cooldown_until timestamp with time zone;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS last_error text;
  `);
}

upgradeTable();
