const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

sb.from('channel_configs')
  .select('shop_id, access_token, shops(name, plan)')
  .limit(1)
  .then(res => {
     console.log(JSON.stringify(res, null, 2));
  })
  .catch(err => {
     console.error(err);
  });
