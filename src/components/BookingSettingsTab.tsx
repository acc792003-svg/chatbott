"use client";

import { useState } from "react";
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

// Mock Data Types
type DiscountRule = {
  id: string;
  startTime: string;
  endTime: string;
  type: 'percent' | 'fixed';
  value: number;
};

export default function BookingSettingsTab() {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [rules, setRules] = useState<DiscountRule[]>([
    { id: '1', startTime: '13:00', endTime: '16:00', type: 'percent', value: 20 }
  ]);

  const addRule = () => {
    setRules([...rules, { id: Date.now().toString(), startTime: '10:00', endTime: '12:00', type: 'percent', value: 10 }]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen p-6 bg-[#fefce8] text-slate-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <style>{`
          .max-w-4xl.mx-auto.space-y-8 .text-blue-500 {
             color: lab(21 9.37 -43.4) !important;
          }
        `}</style>
        
        {/* HEADER SECTION */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-black text-amber-500 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-amber-500" />
              Cấu Hình Đặt Lịch & Ưu Đãi
            </h2>
            <p className="mt-2 text-sm text-blue-500 font-medium">
              Quản lý giờ tiếp khách và các khung giờ Vàng (Happy Hour) để AI chủ động Sale.
            </p>
          </div>
        </div>

        {/* BASIC SETTINGS BLOCK */}
        <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl overflow-hidden p-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
              <CalendarDaysIcon />
            </div>
            <h3 className="text-lg font-bold text-blue-600">Cơ Bản (Lịch Làm Việc)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slot Settings */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
                  <Timer className="w-4 h-4" /> Thời lượng 1 Slot (Phút)
                </label>
                <input 
                  type="number" defaultValue={60} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
                  <Users className="w-4 h-4" /> Số khách tối đa / Slot
                </label>
                <input 
                  type="number" defaultValue={3} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-50"
                />
              </div>
            </div>

            {/* Timings */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
                  <Clock className="w-4 h-4" /> Giờ Mở Cửa
                </label>
                <input 
                  type="time" defaultValue="08:00" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-1">
                  <Clock className="w-4 h-4" /> Giờ Đóng Cửa
                </label>
                <input 
                  type="time" defaultValue="20:00" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED TOGGLE */}
        <div 
          onClick={() => setIsAdvancedMode(!isAdvancedMode)}
          className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between border ${isAdvancedMode ? 'bg-[#fef08a] border-yellow-400 shadow-md' : 'bg-white/70 border-slate-200 hover:bg-white'} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-colors ${isAdvancedMode ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-lg font-bold transition-colors ${isAdvancedMode ? 'text-yellow-700' : 'text-slate-500'}`}>
                Nâng Cao: Cơ Chế Giờ Vàng (Happy Hour)
              </h3>
              <p className="text-sm text-slate-600 mt-1 font-medium">AI Chatbot tự động tư vấn giảm giá khi khách chọn trúng khung giờ vắng.</p>
            </div>
          </div>
          
          {/* Custom Switch UI */}
          <div className="mt-4 sm:mt-0 relative w-14 h-8 bg-slate-200 rounded-full border border-slate-300 p-1 flex items-center">
            <motion.div 
              layout 
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              className={`w-6 h-6 rounded-full shadow-md ${isAdvancedMode ? 'bg-yellow-500' : 'bg-white'}`}
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
              <div className="bg-white/80 backdrop-blur-sm border border-yellow-200 rounded-2xl p-6 mt-2 relative">
                
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-slate-900 font-bold flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-600" />
                    Luật Giảm Giá Khung Giờ
                  </h4>
                  <button 
                    onClick={addRule}
                    className="flex items-center gap-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-300 transition-all font-medium"
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
                        className="flex flex-col md:flex-row items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-yellow-400 transition-colors"
                      >
                         <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between">
                            <input 
                              type="time" defaultValue={rule.startTime}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 outline-none w-[110px] sm:w-32 text-sm"
                            />
                            <span className="text-yellow-600 font-bold mx-1">→</span>
                            <input 
                              type="time" defaultValue={rule.endTime}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 outline-none w-[110px] sm:w-32 text-sm"
                            />
                         </div>

                         <div className="flex-1 flex items-center gap-2 w-full mt-2 md:mt-0">
                           <div className="bg-slate-100 border border-slate-200 p-1 flex rounded-lg shrink-0">
                             <button className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors ${rule.type === 'percent' ? 'bg-yellow-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}>% Giảm</button>
                             <button className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors ${rule.type === 'fixed' ? 'bg-yellow-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}>VNĐ</button>
                           </div>
                           <input 
                              type="number" defaultValue={rule.value}
                              className="w-full flex-1 min-w-[80px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-yellow-500 text-sm font-bold"
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
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5">
            Lưu Cấu Hình Đặt Lịch
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
