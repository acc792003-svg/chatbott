
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  });
} catch (e) {
  console.error('Could not read .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('--- Checking Extra Tables ---');
  try {
    const tables = ['chat_cache', 'faqs', 'shop_templates'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`Table ${table}: EXISTS`);
      }
    }

    console.log('\n--- Checking RPCs ---');
    // Try calling match_faqs with empty/dummy params to see if it exists
    const { error: rpcError } = await supabase.rpc('match_faqs', {
        query_embedding: Array(768).fill(0),
        match_threshold: 0.5,
        match_count: 1,
        p_shop_id: '00000000-0000-0000-0000-000000000000'
    });
    if (rpcError && rpcError.message.includes('does not exist')) {
        console.log('RPC match_faqs: DOES NOT EXIST');
    } else {
        console.log('RPC match_faqs: EXISTS (or param error)');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTables();
