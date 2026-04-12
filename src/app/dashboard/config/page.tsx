'use client';

import { useState, useEffect } from 'react';
import { Save, Info, ShoppingBag, DollarSign, HelpCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConfigPage() {
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [faq, setFaq] = useState('');
  const [isSuperAdminNoShop, setIsSuperAdminNoShop] = useState(false);
  
  useEffect(() => {
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cấu Hình Chatbot</h1>
        <p className="text-slate-500 font-medium">Huấn luyện AI của bạn để bán hàng hiệu quả hơn.</p>
      </div>

      {isSuperAdminNoShop && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">
           <Info className="text-orange-600" />
           <p className="text-orange-800 text-sm font-semibold">Tài khoản này là Super Admin, không bị ràng buộc bởi cửa hàng nào.<br/>Để cấu hình AI thực tế, vui lòng dùng tính năng "Tạo Mã Cửa Hàng" ở Web Mẹ, tạo 1 Shop và Đăng Nhập bằng mã đó.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass p-8 rounded-[2.5rem] space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2">
                <ShoppingBag size={14} className="text-blue-600" />
                Tên cửa hàng
              </label>
              <input 
                type="text" 
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="Ví dụ: Shop Yến Sào Cao Cấp" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2">
                <DollarSign size={14} className="text-green-600" />
                Đơn vị tiền tệ
              </label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                <option>VNĐ (Việt Nam Đồng)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2">
              <FileText size={14} className="text-blue-600" />
              Thông tin sản phẩm
            </label>
            <textarea 
              rows={4}
              value={productInfo}
              onChange={e => setProductInfo(e.target.value)}
              placeholder="Nhập danh sách sản phẩm và giá cả..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest px-2">
              <HelpCircle size={14} className="text-indigo-600" />
              Câu hỏi thường gặp (FAQ)
            </label>
            <textarea 
              rows={4}
              value={faq}
              onChange={e => setFaq(e.target.value)}
              placeholder="Q: Phí ship bao nhiêu? A: Miễn phí toàn quốc..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            ></textarea>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl h-fit">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900 mb-1">Mẹo huấn luyện AI:</p>
              <p className="text-xs text-blue-700 leading-relaxed">AI sẽ sử dụng thông tin này để trả lời khách hàng. Càng chi tiết, AI sẽ tư vấn càng thuyết phục và giống nhân viên thật.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="btn-gradient px-12 py-4 rounded-2xl flex items-center gap-3 shadow-xl shadow-blue-200 disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : (
              <>
                <Save size={20} />
                LƯU CẤU HÌNH
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
