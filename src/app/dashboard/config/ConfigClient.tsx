'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfigClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [faq, setFaq] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  
  useEffect(() => {
    setMounted(true);
    const fetchConfig = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (userData?.shop_id) {
        const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', userData.shop_id).single();
        if (config) {
          setShopName(config.shop_name || '');
          setProductInfo(config.product_info || '');
          setFaq(config.faq || '');
          setFbPageId(config.fb_page_id || '');
          setFbAccessToken(config.fb_access_token || '');
        }
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session?.user.id).single();
      const payload: any = {
        shop_id: userData?.shop_id,
        shop_name: shopName,
        product_info: productInfo,
        faq: faq,
        is_active: true,
      };

      if (fbPageId) payload.fb_page_id = fbPageId;
      if (fbAccessToken) payload.fb_access_token = fbAccessToken;

      const { error } = await supabase.from('chatbot_configs').upsert(payload, { onConflict: 'shop_id' });
      if (error) throw error;
      alert('Đã lưu cấu hình thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 className="text-3xl font-black">Cấu Hình Chatbot</h1>
      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Tên cửa hàng</label>
            <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-3" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Thông tin sản phẩm</label>
            <textarea rows={4} value={productInfo} onChange={e => setProductInfo(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-3" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Câu hỏi thường gặp (FAQ)</label>
            <textarea rows={4} value={faq} onChange={e => setFaq(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-3" />
          </div>
          <div className="pt-6 border-t">
            <label className="block text-blue-600 font-bold mb-4">Facebook Messenger Integration <span className="text-sm font-normal text-slate-400 ml-2">(Tuỳ chọn - Có thể bỏ trống)</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} placeholder="Page ID (Không bắt buộc)" className="w-full bg-slate-50 border rounded-xl p-3" />
              <input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} placeholder="Access Token (Không bắt buộc)" className="w-full bg-slate-50 border rounded-xl p-3" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg">
          {loading ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}
        </button>
      </form>
    </div>
  );
}
