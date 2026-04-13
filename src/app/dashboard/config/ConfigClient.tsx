'use client';

import { useState, useEffect } from 'react';
import { Save, Info, ShoppingBag, DollarSign, HelpCircle, FileText, Facebook } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConfigClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [faq, setFaq] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [isSuperAdminNoShop, setIsSuperAdminNoShop] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const fetchConfig = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase.from('users').select('shop_id, role').eq('id', session.user.id).single();
      
      if (!userData?.shop_id && userData?.role === 'super_admin') {
         setIsSuperAdminNoShop(true);
      }

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
      if (!session) throw new Error("Chưa đăng nhập");
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (!userData?.shop_id) throw new Error("Tài khoản chưa được liên kết cửa hàng");

      const { error } = await supabase.from('chatbot_configs').upsert({
        shop_id: userData.shop_id,
        shop_name: shopName,
        product_info: productInfo,
        faq: faq,
        fb_page_id: fbPageId,
        fb_access_token: fbAccessToken,
        is_active: true
      }, { onConflict: 'shop_id' });

      if (error) throw error;
      alert('Đã lưu cấu hình thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-8 text-slate-500 font-bold">Đang tải cấu hình...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>Cấu Hình Chatbot</h1>
        <p className="text-slate-500 font-medium">Huấn luyện AI và tích hợp Facebook cho cửa hàng của bạn.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2">
                <ShoppingBag size={14} className="text-blue-600" />
                Tên cửa hàng
              </label>
              <input 
                type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2"><FileText size={14} className="text-blue-600" /> Thông tin sản phẩm</label>
            <textarea rows={4} value={productInfo} onChange={e => setProductInfo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm"></textarea>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2"><HelpCircle size={14} className="text-indigo-600" /> Câu hỏi thường gặp</label>
            <textarea rows={4} value={faq} onChange={e => setFaq(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm"></textarea>
          </div>
          <div className="pt-8 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-xs tracking-widest"><Facebook size={16} /> Facebook Integration</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} placeholder="Page ID" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" />
              <input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} placeholder="Access Token" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-gradient px-12 py-4 rounded-2xl shadow-xl font-bold">LƯU CẤU HÌNH</button>
        </div>
      </form>
    </div>
  );
}
