'use client';

import { useState } from 'react';
import { Save, Info, ShoppingBag, DollarSign, HelpCircle, FileText } from 'lucide-react';

export default function ConfigPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulating save
    setTimeout(() => {
      alert('Đã lưu cấu hình thành công!');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cấu Hình Chatbot</h1>
        <p className="text-slate-500 font-medium">Huấn luyện AI của bạn để bán hàng hiệu quả hơn.</p>
      </div>

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
