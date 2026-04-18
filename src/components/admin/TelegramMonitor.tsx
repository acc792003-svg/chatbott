'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, ShieldAlert, BarChart3, 
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
        .order('created_at', { ascending: false })
        .limit(2000);

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
    return Math.max(0, Math.round(100 - (failRate * 2.5)));
  };

  const healthScore = getHealthScore();
  const isKritical = stats && (stats.failed / stats.total) > 0.3;

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">📡 Đang kiểm tra đường truyền Telegram...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 📊 TELEGRAM CHANNEL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Channel Health</p>
          <div className="flex items-end gap-2">
            <h3 className={cn(
              "text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br", 
              healthScore > 80 ? "from-emerald-500 to-emerald-700" : healthScore > 50 ? "from-amber-400 to-amber-600" : "from-red-500 to-red-700"
            )}>
              {healthScore}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 mb-1.5">/ 100</span>
          </div>
          <div className={cn(
            "absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm",
            healthScore > 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100 animate-pulse"
          )}>
            {healthScore > 80 ? 'STABLE' : 'CRITICAL'}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Rate</p>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black text-slate-800">{stats?.successRate || 0}%</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-1000" style={{ width: `${stats?.successRate || 0}%` }}></div>
          </div>
        </div>

        {/* Failed counts specifically for Telegram */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-xl shadow-red-100/50 border-l-4 border-l-red-500 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Failed Leads</p>
          <div className="flex items-center gap-3">
            <h3 className="text-4xl font-black text-red-600">{stats?.failed || 0}</h3>
            {isKritical && <span className="text-[10px] font-black bg-gradient-to-r from-red-600 to-rose-600 text-white px-2 py-0.5 rounded shadow-lg animate-bounce">ISSUE</span>}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Total Notifications</p>
          <h3 className="text-4xl font-black text-slate-800">{stats?.total || 0}</h3>
        </div>
      </div>

      {/* 🚨 CRITICAL ALERT */}
      {isKritical && (
         <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-red-500/30 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 border border-red-400/50">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-3xl animate-pulse shadow-inner">📢</div>
               <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Telegram Channel Issue</h3>
                  <p className="text-xs font-bold text-white/80 mt-1">Hệ thống gửi tin Telegram đang lỗi nhiều. Khẩn cấp kiểm tra Bot Token tổng của hệ thống.</p>
               </div>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ⚙️ TELEGRAM BOT CONFIG */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Bot size={120} /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500 rounded-2xl"><Settings2 size={24}/></div>
                <h2 className="text-lg font-black tracking-tight uppercase">Bot Hệ Thống</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Fallback Bot Token</label>
                  <div className="relative">
                    <input type={showToken ? "text" : "password"} value={systemBotToken} onChange={e => setSystemBotToken(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-mono outline-none focus:border-indigo-500" placeholder="Nhập token bot tổng..." />
                    <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showToken ? <Activity size={16}/> : <Activity size={16} className="rotate-45" />}
                    </button>
                  </div>
                </div>
                <button onClick={handleUpdateToken} disabled={updating} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center justify-center gap-2">
                  {updating ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🚨 RECENT TELEGRAM ERRORS */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-2xl shadow-slate-200/50 flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-400/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-red-400 to-rose-600 text-white rounded-2xl shadow-[0_10px_20px_-5px_rgba(244,63,94,0.5)]"><ShieldAlert size={20}/></div>
              <div>
                <h2 className="text-xl font-black bg-gradient-to-r from-red-600 to-rose-700 bg-clip-text text-transparent tracking-tight leading-none">NHẬT KÝ LỖI KÊNH</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Telegram Specific Logs</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
              {recentFails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                   <BarChart3 size={48} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Đường truyền Telegram thông suốt</p>
                </div>
              ) : (
                recentFails.map((fail, idx) => (
                  <div key={idx} className="bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-start gap-4">
                     <div className="bg-red-500 w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-black text-red-600 uppercase">Gửi tin thất bại</p>
                          <span className="text-[9px] font-bold text-slate-400 italic">
                            {new Date(fail.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mb-1">{fail.telegram_error || 'Lỗi kết nối API'}</p>
                        <p className="text-[10px] text-slate-500 font-medium italic">Vui lòng kiểm tra lại Token hoặc Chat ID của shop tương ứng.</p>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
