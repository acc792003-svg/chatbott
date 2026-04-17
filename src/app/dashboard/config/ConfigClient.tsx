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
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  
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
          setTelegramChatId(config.telegram_chat_id || '');
          setTelegramBotToken(config.telegram_bot_token || '');
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
        telegram_chat_id: telegramChatId,
        telegram_bot_token: telegramBotToken
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
            <label className="block text-blue-600 font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.35-1 .53-1.42.52-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.78-1.65 6.31-2.74 7.58-3.27 3.61-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.5.15.13.12.17.29.18.41.01.07.01.19 0 .26z"/></svg>
              Telegram Notification <span className="text-sm font-normal text-slate-400 ml-2">(SĐT khách sẽ được gửi về đây)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telegram Chat ID</label>
                <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="VD: 12345678" className="w-full bg-slate-50 border rounded-xl p-3" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bot Token (Tùy chọn)</label>
                <input type="password" value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} placeholder="Bỏ trống nếu dùng Bot mặc định" className="w-full bg-slate-50 border rounded-xl p-3" />
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">Dùng @userinfobot trên Telegram để lấy Chat ID của bạn.</p>
          </div>

          <div className="pt-6 border-t opacity-50">
            <label className="block text-blue-600 font-bold mb-4">Facebook Messenger Integration <span className="text-sm font-normal text-slate-400 ml-2">(Sắp ra mắt)</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} placeholder="Page ID" className="w-full bg-slate-50 border rounded-xl p-3" disabled />
              <input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} placeholder="Access Token" className="w-full bg-slate-50 border rounded-xl p-3" disabled />
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
          {loading ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}
        </button>
      </form>
    </div>
  );
}
