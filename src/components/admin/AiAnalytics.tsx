'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Activity, Zap, Database, Cpu, TrendingUp, Clock, MousePointer2,
  AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AiAnalytics() {
  const [loading, setLoading] = useState(true);
  const [perfStats, setPerfStats] = useState<any>(null);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. THỐNG KÊ HIỆU SUẤT AI (Từ chat_logs)
      const { data: logs } = await supabase
        .from('chat_logs')
        .select('source, latency_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (logs && logs.length > 0) {
        const avgLatency = Math.round(logs.reduce((acc: number, curr: any) => acc + (curr.latency_ms || 0), 0) / logs.length);
        const faqCount = logs.filter((l: any) => l.source === 'faq').length;
        const cacheCount = logs.filter((l: any) => l.source === 'cache').length;
        const aiCount = logs.filter((l: any) => l.source === 'ai').length;

        setPerfStats({
          avgLatency,
          total: logs.length,
          distribution: {
            faq: Math.round((faqCount / logs.length) * 100),
            cache: Math.round((cacheCount / logs.length) * 100),
            ai: Math.round((aiCount / logs.length) * 100)
          }
        });
      }

      // 2. THỐNG KÊ GIAO TIN (Từ leads)
      const { data: leads } = await supabase
        .from('leads')
        .select('telegram_status')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (leads) {
        const total = leads.length;
        const success = leads.filter((l: any) => l.telegram_status === 'success').length;
        const failed = leads.filter((l: any) => l.telegram_status === 'failed').length;
        const duplicate = leads.filter((l: any) => l.telegram_status === 'duplicate').length;
        const validTotal = total - duplicate;
        
        setDeliveryStats({
          rate: validTotal > 0 ? Math.round((success / validTotal) * 100) : 100,
          failedCount: failed
        });
      }

    } catch (e) {
      console.error('Error fetching AI analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const getMasterHealth = () => {
    if (!perfStats || !deliveryStats) return 100;
    
    // 50% từ Delivery Rate
    const deliveryScore = deliveryStats.rate * 0.5;
    
    // 50% từ Latency (Tối ưu < 2.5s)
    const latencyFactor = Math.max(0, 1 - (perfStats.avgLatency / 6000));
    const latencyScore = latencyFactor * 100 * 0.5;
    
    return Math.round(deliveryScore + latencyScore);
  };

  const masterHealth = getMasterHealth();
  const latencyAlert = perfStats && perfStats.avgLatency > 3000;
  const deliveryAlert = deliveryStats && deliveryStats.rate < 80;

  if (loading) return <div className="p-8 text-xs font-bold text-slate-500 animate-pulse uppercase tracking-widest">📡 Đang giải mã dữ liệu nơ-ron...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 🚀 MASTER SYSTEM HEALTH (Con số duy nhất) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Synthetic Health Score */}
        <div className={cn(
            "md:col-span-2 p-10 rounded-[3rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-700",
            masterHealth > 85 ? "bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 border border-emerald-500/20" : 
            masterHealth > 60 ? "bg-gradient-to-br from-amber-900 via-slate-900 to-slate-900 border border-amber-500/20" : "bg-gradient-to-br from-red-950 via-slate-900 to-slate-900 border border-red-500/40 animate-pulse"
        )}>
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldAlert size={160} className={masterHealth < 60 ? "text-red-500" : "text-white"} />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-xl", masterHealth > 60 ? "bg-white/10" : "bg-red-500 text-white")}>
                        <Activity size={24}/>
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight leading-none">SYSTEM MASTER HEALTH</h2>
                        <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", masterHealth > 85 ? "text-emerald-400" : "text-amber-400")}>
                            {masterHealth > 85 ? "Toàn hệ thống ổn định" : "Cần chú ý hiệu suất"}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-end gap-3 mt-8">
                    <h3 className="text-7xl font-black text-white">{masterHealth}</h3>
                    <div className="mb-3">
                        <p className="text-xs font-black text-white/60 uppercase">/ 100</p>
                        <div className="flex gap-1 mt-1">
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className={cn("w-3 h-1.5 rounded-full", (masterHealth >= i * 20) ? "bg-emerald-500" : "bg-white/10")}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Proactive Latency Alert */}
        <div className={cn(
            "bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white flex flex-col justify-between transition-all shadow-xl shadow-slate-200/50",
            latencyAlert && "border-amber-500 shadow-amber-100 ring-4 ring-amber-50"
        )}>
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Zap size={14} className={latencyAlert ? "text-amber-600 animate-bounce" : "text-slate-500"}/> AI Processing
                  </p>
                  <div className="flex items-end gap-1">
                     <h3 className={cn("text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r", latencyAlert ? "from-amber-500 to-amber-700" : "from-slate-800 to-slate-600")}>
                        {perfStats?.avgLatency || 0}
                     </h3>
                     <span className="text-[10px] font-bold text-slate-500 mb-1.5">ms</span>
                  </div>
               </div>
               {latencyAlert && <AlertTriangle size={24} className="text-amber-600 animate-pulse" />}
            </div>
            <div className="mt-8">
               <p className={cn("text-[10px] font-black uppercase", latencyAlert ? "text-amber-600" : "text-emerald-600")}>
                  {latencyAlert ? "⚠️ Tốc độ chậm (High Latency)" : "⚡ Phản hồi siêu tốc"}
               </p>
               <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", latencyAlert ? "bg-amber-500 w-[80%]" : "bg-emerald-500 w-[30%]")}></div>
               </div>
            </div>
        </div>

        {/* Proactive Delivery Alert */}
        <div className={cn(
            "bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white flex flex-col justify-between transition-all shadow-xl shadow-slate-200/50",
            deliveryAlert && "border-red-500 shadow-red-100 ring-4 ring-red-50"
        )}>
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Send size={14} className={deliveryAlert ? "text-red-600 animate-ping" : "text-slate-500"}/> Lead Delivery
                  </p>
                  <div className="flex items-end gap-1">
                     <h3 className={cn("text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r", deliveryAlert ? "from-red-500 to-red-700" : "from-indigo-600 to-blue-600")}>
                        {deliveryStats?.rate || 0}%
                     </h3>
                  </div>
               </div>
               {deliveryAlert && <ShieldAlert size={24} className="text-red-600 animate-pulse" />}
            </div>
            <div className="mt-8">
               <p className={cn("text-[10px] font-black uppercase", deliveryAlert ? "text-red-600" : "text-indigo-600")}>
                  {deliveryAlert ? "🚫 Sự cố đường truyền" : "✅ Giao tin thông suốt"}
               </p>
               <div className={cn("w-full h-1.5 rounded-full mt-2 overflow-hidden", deliveryAlert ? "bg-red-100" : "bg-indigo-100")}>
                  <div className={cn("h-full transition-all duration-1000", deliveryAlert ? "bg-red-500" : "bg-indigo-500")} style={{ width: `${deliveryStats?.rate || 0}%` }}></div>
               </div>
            </div>
        </div>
      </div>

      {/* 📊 EFFICIENCY & TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white shadow-2xl shadow-indigo-100/40">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">ENGINE EFFICIENCY</h2>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Hiệu quả tiết kiệm tài nguyên</p>
                </div>
                <button onClick={fetchData} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                    <RefreshCw size={20}/>
                </button>
            </div>

            <div className="space-y-8">
                {[
                    { label: '0$ Knowledge Base (FAQ)', val: perfStats?.distribution.faq, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
                    { label: '0$ Semantic Cache', val: perfStats?.distribution.cache, icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-600' },
                    { label: 'Paid AI Reasoning (Gemini)', val: perfStats?.distribution.ai, icon: Cpu, color: 'text-slate-600', bg: 'bg-slate-50', bar: 'bg-slate-900' }
                ].map((item: any, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl", item.bg, item.color)}><item.icon size={18}/></div>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.label}</span>
                            </div>
                            <span className={cn("text-lg font-black", item.color)}>{item.val}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", item.bar)} style={{ width: `${item.val}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 p-10 rounded-[3rem] shadow-[0_20px_50px_-15px_rgba(30,58,138,0.5)] border border-white/10 flex flex-col justify-center text-center">
            <h3 className="text-2xl font-black text-white px-10 mb-4 tracking-wider">TOTAL SAVINGS RATIO</h3>
            <div className="inline-flex bg-emerald-500/20 text-emerald-400 p-10 rounded-full mx-auto my-6 border-4 border-emerald-500/30 shadow-[0_0_50px_-10px_rgba(16,185,129,0.4)]">
                <TrendingUp size={80} />
            </div>
            <p className="text-indigo-200 text-sm font-medium px-4 leading-relaxed mb-4">
                Bằng cách xử lý <span className="text-white font-black text-lg">{(perfStats?.distribution.faq || 0) + (perfStats?.distribution.cache || 0)}%</span> yêu cầu thông qua FAQ & Cache, bạn đang chạy một hệ thống 
                <span className="text-emerald-400 font-bold ml-1 uppercase bg-emerald-950/50 px-2 py-1 rounded border border-emerald-500/30">Hiệu quả nhất thị trường.</span>
            </p>
         </div>
      </div>

    </div>
  );
}
