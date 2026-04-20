const url = 'https://bfyjwibykbgsvburxyjv.supabase.co/rest/v1/system_errors?select=*&order=created_at.desc&limit=5';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("=== LỖI HỆ THỐNG GẦN ĐÂY ===");
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));

const url2 = 'https://bfyjwibykbgsvburxyjv.supabase.co/rest/v1/channel_configs?select=*';
fetch(url2, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("=== CẤU HÌNH KÊNH (CHANNEL CONFIGS) ===");
  console.log(JSON.stringify(data, null, 2));
});
