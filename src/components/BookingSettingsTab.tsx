"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Users, 
  Settings2, 
  Gift, 
  Plus, 
  Trash2, 
  Sparkles,
  Timer
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Mock Data Types
type DiscountRule = {
  id?: string;
  startTime: string;
  endTime: string;
  type: 'percent' | 'fixed';
  value: number;
};

export default function BookingSettingsTab() {
  const [loading, setLoading] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  // Settings States
  const [slotDuration, setSlotDuration] = useState(0);
  const [maxSlots, setMaxSlots] = useState(0);
  const [workingStart, setWorkingStart] = useState("08:00");
  const [workingEnd, setWorkingEnd] = useState("20:00");

  const [rules, setRules] = useState<DiscountRule[]>([
    { startTime: '13:00', endTime: '16:00', type: 'percent', value: 0 }
  ]);

  // Fetch Existing Data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        
        // Fetch Settings
        const { data: settings } = await supabase.from('shop_settings').select('*').eq('shop_id', userData.shop_id).single();
        if (settings) {
          setSlotDuration(settings.slot_duration_minutes || 0);
          setMaxSlots(settings.max_slot_per_block || 0);
        }

        // Fetch Rules
        const { data: dbRules } = await supabase.from('discount_rules').select('*').eq('shop_id', userData.shop_id);
        if (dbRules && dbRules.length > 0) {
          setRules(dbRules.map((r: any) => ({
             id: r.id,
             startTime: r.start_time.substring(0, 5),
             endTime: r.end_time.substring(0, 5),
             type: r.discount_type,
             value: r.discount_value
          })));
          setIsAdvancedMode(true);
        }
      }
    };
    fetchData();
  }, []);

  const addRule = () => {
    setRules([...rules, { startTime: '10:00', endTime: '12:00', type: 'percent', value: 0 }]);
  };

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!shopId) return alert("Không tìm thấy Shop ID!");
    setLoading(true);
    try {
      // 1. Save Shop Settings (Upsert)
      const { error: settingsError } = await supabase.from('shop_settings').upsert({
         shop_id: shopId,
         slot_duration_minutes: slotDuration,
         max_slot_per_block: maxSlots,
         working_start: '00:00',
         working_end: '23:59',
         timezone: 'Asia/Ho_Chi_Minh'
      }, { onConflict: 'shop_id' });

      if (settingsError) throw settingsError;

      // 2. Clear old rules and insert new ones
      await supabase.from('discount_rules').delete().eq('shop_id', shopId);
      if (isAdvancedMode && rules.length > 0) {
         const rulesToInsert = rules.map(r => ({
            shop_id: shopId,
            start_time: r.startTime,
            end_time: r.endTime,
            discount_type: r.type,
            discount_value: r.value,
            is_active: true
         }));
         const { error: rulesError } = await supabase.from('discount_rules').insert(rulesToInsert);
         if (rulesError) throw rulesError;
      }

      alert("✅ Đã lưu cấu hình và huấn luyện AI thành công!");
    } catch (e: any) {
      alert("❌ Lỗi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[#f8f7f4] text-slate-800">
      <div className="max-w-4xl mx-auto space-y-8">
        <style>{`
          .max-w-4xl.mx-auto.space-y-8 .text-blue-500 {
             color: lab(21 9.37 -43.4) !important;
          }
        `}</style>
        
        {/* HEADER SECTION */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-200 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-black text-amber-500 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-amber-500" />
              Cấu Hình Đặt Lịch & Ưu Đãi
            </h2>
            <p className="mt-2 text-sm text-blue-500 font-medium">
              Quản lý giờ tiếp khách và các khung giờ Vàng (Happy Hour) để AI chủ động Sale.
            </p>
          </div>
        </div>

        {/* LIVE STATUS UPDATE BLOCK */}
        <div className="bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200/30 pb-4 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
               <Timer className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-amber-900">Trạng Thái Live (Cập nhật nhanh)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Wait time */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[13px] font-black text-blue-600 uppercase mb-2">
                  1. Bao nhiêu phút nữa trống lịch?
                </label>
                <div className="relative">
                  <input 
                    type="number" value={slotDuration} 
                    onChange={(e) => setSlotDuration(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="Ví dụ: 30"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">PHÚT</span>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-1">* Nhập 0 nếu đang có chỗ trống ngay lập tức.</p>
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[13px] font-black text-blue-600 uppercase mb-2">
                  2. Số chỗ dự kiến sẽ trống?
                </label>
                <div className="relative">
                  <input 
                    type="number" value={maxSlots} 
                    onChange={(e) => setMaxSlots(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="Ví dụ: 2"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">CHỖ</span>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-1">* Số lượng khách sếp có thể nhận tại thời điểm đó.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED TOGGLE */}
        <div 
          onClick={() => setIsAdvancedMode(!isAdvancedMode)}
          className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between border ${isAdvancedMode ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white/40 border-slate-200/50 hover:bg-white/60'} backdrop-blur-md`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-colors ${isAdvancedMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-lg font-bold transition-colors ${isAdvancedMode ? 'text-amber-900' : 'text-slate-600'}`}>
                Nâng Cao: Cơ Chế Giờ Vàng (Happy Hour)
              </h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">AI Chatbot tự động tư vấn giảm giá khi khách chọn trúng khung giờ vắng.</p>
            </div>
          </div>
          
          {/* Custom Switch UI */}
          <div className="mt-4 sm:mt-0 relative w-14 h-8 bg-slate-200 rounded-full border border-slate-300 p-1 flex items-center">
            <motion.div 
              layout 
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              className={`w-6 h-6 rounded-full shadow-md ${isAdvancedMode ? 'bg-amber-500' : 'bg-white'}`}
              style={{ marginLeft: isAdvancedMode ? '24px' : '0px' }}
            />
          </div>
        </div>

        {/* DISCOUNT RULES SECTION */}
        <AnimatePresence>
          {isAdvancedMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/40 backdrop-blur-md border border-amber-200/50 rounded-2xl p-6 mt-2 relative">
                
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-slate-800 font-bold flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600" />
                    Luật Giảm Giá Khung Giờ
                  </h4>
                  <button 
                    onClick={addRule}
                    className="flex items-center gap-2 text-sm bg-amber-100/50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 transition-all font-medium"
                  >
                    <Plus className="w-4 h-4" /> Thêm Giờ Vàng
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  <AnimatePresence>
                    {rules.map((rule) => (
                      <motion.div 
                        key={rule.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="flex flex-col md:flex-row items-center gap-2 bg-white/60 border border-slate-200/40 rounded-xl p-3 shadow-sm hover:border-amber-400 transition-colors"
                      >
                         <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between">
                            <input 
                              type="time" defaultValue={rule.startTime}
                              className="bg-white/80 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 outline-none w-[110px] sm:w-32 text-sm focus:border-amber-400"
                            />
                            <span className="text-amber-600 font-bold mx-1">→</span>
                            <input 
                              type="time" defaultValue={rule.endTime}
                              className="bg-white/80 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 outline-none w-[110px] sm:w-32 text-sm focus:border-amber-400"
                            />
                         </div>

                         <div className="flex-1 flex items-center gap-2 w-full mt-2 md:mt-0">
                           <div className="bg-slate-100/50 border border-slate-200/60 p-1 flex rounded-lg shrink-0">
                             <button className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors ${rule.type === 'percent' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>% Giảm</button>
                             <button className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors ${rule.type === 'fixed' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>VNĐ</button>
                           </div>
                           <input 
                              type="number" defaultValue={rule.value}
                              className="w-full flex-1 min-w-[80px] bg-white/80 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold"
                              placeholder="Mức giảm..."
                            />
                         </div>

                         <button 
                           onClick={() => removeRule(rule.id)}
                           className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0 shrink-0"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {rules.length === 0 && (
                    <div className="text-center py-8 text-blue-500 font-medium border border-dashed border-white/10 rounded-xl">
                      Chưa có quy tắc Happy Hour nào được thêm.
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang đồng bộ AI...
              </>
            ) : "Lưu Cấu Hình Đặt Lịch"}
          </button>
        </div>

      </div>
    </div>
  );
}

// Bổ sung Icon Calendar (do Lucide thiếu sẵn biến thể này nếu import name sai)
function CalendarDaysIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <path d="M8 14h.01"></path>
      <path d="M12 14h.01"></path>
      <path d="M16 14h.01"></path>
      <path d="M8 18h.01"></path>
      <path d="M12 18h.01"></path>
      <path d="M16 18h.01"></path>
    </svg>
  );
}
