'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Send, HelpCircle } from 'lucide-react';

export default function ConfigClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [customerInsights, setCustomerInsights] = useState('');
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
        // 1. Fetch Basic Config & Telegram
        const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', userData.shop_id).single();
        if (config) {
          setShopName(config.shop_name || '');
          setProductInfo(config.product_info || '');
          setCustomerInsights(config.customer_insights || '');
          setFaq(config.faq || '');
          setTelegramChatId(config.telegram_chat_id || '');
          setTelegramBotToken(config.telegram_bot_token || '');
        }
// ... (Fb logic remains same)
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Chưa đăng nhập');
      
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (!userData?.shop_id) throw new Error('Không tìm thấy shop');

      const shopId = userData.shop_id;

      // 1. Lưu cấu hình Chatbot cơ bản & Telegram
      const { error: configError } = await supabase.from('chatbot_configs').upsert({
        shop_id: shopId,
        shop_name: shopName.trim(),
        product_info: productInfo.trim(),
        customer_insights: customerInsights.trim(),
        faq: faq.trim(),
        is_active: true,
        telegram_chat_id: telegramChatId.trim(),
        telegram_bot_token: telegramBotToken.trim()
      }, { onConflict: 'shop_id' });
// ... (rest of handleSave remains same)
      if (configError) throw configError;

      // 2. Lưu Facebook ...
    } catch (err: any) {
      alert('❌ Lỗi: ' + err.message);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Thông tin sản phẩm</label>
              <textarea rows={6} value={productInfo} onChange={e => setProductInfo(e.target.value)} placeholder="Ví dụ: Shop chuyên bán túi xách, địa chỉ tại..." className="w-full bg-slate-50 border rounded-xl p-3" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2 border-b-2 border-indigo-100 w-fit text-indigo-600">Kịch bản tư vấn & Giọng điệu ✨</label>
              <textarea rows={6} value={customerInsights} onChange={e => setCustomerInsights(e.target.value)} placeholder="Dán kịch bản 4 bước hoặc quy trình chốt đơn của bạn vào đây..." className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl p-3" />
            </div>
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
                <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="VD: 12345678" className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bot Token (Tùy chọn)</label>
                <div className="relative">
                  <input 
                    type={showToken ? "text" : "password"} 
                    value={telegramBotToken} 
                    onChange={e => setTelegramBotToken(e.target.value)} 
                    placeholder="1234567890:AAH-S5..." 
                    className="w-full bg-slate-50 border rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono text-sm" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
               <HelpCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
               <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                  Định dạng Token chuẩn có dạng <code className="bg-blue-100 px-1 rounded text-blue-800">123456:AAH-S5...</code>. 
                  Hãy đảm bảo bạn đã nhấn <strong>START</strong> bot trên Telegram trước khi lưu.
               </p>
            </div>
          </div>

          <div className="pt-6 border-t">
            <label className="block text-indigo-600 font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.04c-5.5 0-10 4.43-10 9.89 0 3.12 1.45 5.86 3.73 7.66l-.04 3.03c0 .17.14.3.31.3.09 0 .17-.03.23-.1l3.59-1.98c.7.2 1.43.3 2.18.3 5.5 0 10-4.43 10-9.89s-4.5-9.89-10-9.89zm5.06 12.08l-2.61-2.73-5.11 2.73 5.62-5.97 2.61 2.73 5.11-2.73-5.62 5.97z"/></svg>
              Facebook Messenger Integration <span className="text-sm font-normal text-slate-400 ml-2">(Hệ thống Bọc thép V3)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Page ID</label>
                <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} placeholder="Nhập ID Fanpage..." className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Page Access Token</label>
                <input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} placeholder="Dán EA... Token vào đây" className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm" />
              </div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest text-sm">
          {loading ? 'ĐANG LƯU HỆ THỐNG...' : 'XÁC NHẬN LƯU CẤU HÌNH'}
        </button>
      </form>
    </div>
  );
}
