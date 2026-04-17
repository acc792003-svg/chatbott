'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Send, AlertCircle, CheckCircle2, ShieldAlert, BarChart3, 
  Activity, RefreshCw, Bot, BellRing, Settings2, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TelegramMonitor() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentFails, setRecentFails] = useState<any[]>([]);
  const [systemBotToken, setSystemBotToken] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy cấu hình Bot hệ thống
      const { data: sysSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_telegram_bot_token')
        .single();
      if (sysSetting) setSystemBotToken(sysSetting.value);

      // 2. Thống kê Lead & Telegram
      const { data: leads } = await supabase
        .from('leads')
        .select('telegram_status, telegram_error, created_at')
        .order('created_at', { ascending: false });

      if (leads) {
        const total = leads.length;
        const success = leads.filter((l: any) => l.telegram_status === 'success').length;
        const failed = leads.filter((l: any) => l.telegram_status === 'failed').length;
        const duplicate = leads.filter((l: any) => l.telegram_status === 'duplicate').length;
        
        setStats({
          total,
          success,
          failed,
          duplicate,
          successRate: total > 0 ? Math.round((success / (total - duplicate)) * 100) : 0
        });

        // 3. Lấy 10 lỗi gần nhất
        setRecentFails(leads.filter((l: any) => l.telegram_status === 'failed').slice(0, 10));
      }
    } catch (e) {
      console.error('Error fetching monitor data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateToken = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'system_telegram_bot_token', 
          value: systemBotToken,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
      alert('Đã cập nhật Bot hệ thống!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const getHealthScore = () => {
    if (!stats || stats.total === 0) return 100;
    const failRate = (stats.failed / (stats.total - stats.duplicate)) * 100;
    return Math.max(0, Math.round(100 - (failRate * 2.5))); // Penalty x2.5 for failures
  };

  const healthScore = getHealthScore();
  const isKritical = stats && (stats.failed / stats.total) > 0.3;

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400 animate-pulse">📡 CONNECTING TO TELEGRAM RADAR...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Score</p>
          <div className="flex items-end gap-2">
            <h3 className={cn(
              "text-3xl font-black", 
              healthScore > 80 ? "text-emerald-600" : healthScore > 50 ? "text-amber-500" : "text-red-600"
            )}>
              {healthScore}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 mb-1">/ 100</span>
          </div>
          <div className={cn(
            "absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full",
            healthScore > 80 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600 animate-pulse"
          )}>
            {healthScore > 80 ? 'STABLE' : 'CRITICAL'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỉ lệ gửi (Success)</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-slate-900">{stats.successRate}%</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${stats.successRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Lượt lỗi (Failed)</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-black text-red-600">{stats.failed}</h3>
            {isKritical && <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded animate-bounce">DANGER</span>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Tổng Lead</p>
          <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
        </div>
      </div>

      {/* 🚨 CRITICAL ALERT COMPONENT */}
      {isKritical && (
         <div className="bg-red-600 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-red-200 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl animate-pulse">📢</div>
               <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">CẢNH BÁO: HỆ THỐNG ĐANG GẶP SỰ CỐ GỬI TIN</h3>
                  <p className="text-xs font-bold text-white/80">Tỉ lệ lỗi vượt quá 30%. Vui lòng kiểm tra Token Bot hệ thống hoặc API Rate Limit.</p>
               </div>
            </div>
            <button onClick={handleUpdateToken} className="bg-white text-red-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all shadow-xl">Kiểm tra ngay</button>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ⚙️ SYSTEM CONFIG */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Bot size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500 rounded-2xl"><Settings2 size={24}/></div>
                <h2 className="text-lg font-black tracking-tight">BOT HỆ THỐNG</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Fallback Bot Token</label>
                  <div className="relative">
                    <input 
                      type={showToken ? "text" : "password"}
                      value={systemBotToken}
                      onChange={e => setSystemBotToken(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-mono outline-none focus:border-indigo-500"
                      placeholder="Nhập token bot tổng..." 
                    />
                    <button 
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showToken ? <Activity size={16}/> : <Activity size={16} className="rotate-45" />}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateToken}
                  disabled={updating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {updating ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                  Lưu cấu hình hệ thống
                </button>
              </div>

              <div className="mt-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex gap-3">
                  <Info size={16} className="text-indigo-400 shrink-0 mt-0.5"/>
                  <p className="text-[10px] text-white/60 leading-relaxed italic">
                    Đây là Bot dự phòng. Nếu Shop không cấu hình Bot riêng, hệ thống sẽ tự dùng Bot này để gửi thông báo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🚨 RECENT ERRORS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><ShieldAlert size={24}/></div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">NHẬT KÝ SỰ CỐ</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Telegram Error Radar</p>
                </div>
              </div>
              <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 transition-all">
                <RefreshCw size={18}/>
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
              {recentFails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                   <BarChart3 size={48} />
                   <p className="text-[10px] font-black uppercase">Không có sự cố nào được ghi nhận</p>
                </div>
              ) : (
                recentFails.map((fail, idx) => (
                  <div key={idx} className="bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-start gap-4 animate-in slide-in-from-right-2" style={{ animationDelay: `${idx * 50}ms` }}>
                     <div className="bg-red-500 w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-black text-red-600 uppercase">SỰ CỐ GỬI TIN</p>
                          <span className="text-[9px] font-bold text-slate-400 italic">
                            {new Date(fail.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mb-1">{fail.telegram_error || 'Lỗi không xác định'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">SĐT liên quan: {fail.phone}</p>
                     </div>
                  </div>
                ))
              )}
            </div>

            {stats && stats.failed > 30 && (
               <div className="mt-6 p-4 bg-orange-100 border-2 border-orange-200 rounded-3xl flex items-center gap-4 animate-bounce">
                  <div className="text-2xl">🚨</div>
                  <p className="text-[10px] font-black text-orange-800 uppercase leading-relaxed">
                    Chú ý: Tỉ lệ lỗi đang cao bất thường ({Math.round(stats.failed/stats.total*100)}%). Hãy kiểm tra Token Bot hệ thống!
                  </p>
               </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
