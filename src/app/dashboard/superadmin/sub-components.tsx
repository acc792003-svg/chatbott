import React from 'react';
import { 
    Brain, Lock, Settings, AlertTriangle, Info, RefreshCcw, 
    Power, ShieldCheck, Zap, Activity, ShieldAlert, Copy,
    CheckCircle, MessageCircle, Package, Send, Edit2, Square, CheckSquare, Trash2, Layers,
    Clock, Search, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

/**
 * 📊 VIEW 1: AI KEY MONITOR (REAL-TIME COMMAND CENTER)
 */
export function ApiKeysView({
    systemStats, onSave, addToast
}: any) {
    const keys = systemStats?.keys || [];
    const metrics = systemStats?.metrics || { total_messages_24h: 0, cache_hit_rate: 0 };

    const handleAction = async (id: string, action: 'reset' | 'toggle') => {
        try {
            const res = await fetch('/api/admin/system/keys/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();
            if (data.success) {
                addToast(action === 'reset' ? 'Đã reset trạng thái Key' : 'Đã thay đổi trạng thái Key', 'success');
            } else {
                addToast(data.error || 'Lỗi thao tác', 'error');
            }
        } catch (e) {
            addToast('Lỗi kết nối server', 'error');
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. HEADER & GLOBAL METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10"><Activity size={80}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tin nhắn (24h)</p>
                    <h3 className="text-3xl font-black text-indigo-400">{metrics.total_messages_24h}</h3>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ Cache Hit</p>
                    <h3 className="text-3xl font-black text-emerald-600">{metrics.cache_hit_rate}%</h3>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Key đang chạy</p>
                    <h3 className="text-3xl font-black text-slate-800">
                        {keys.filter((k: any) => k.status === 'active').length}/{keys.length}
                    </h3>
                </div>
            </div>

            {/* 2. MAIN MONITOR TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <Activity className="text-indigo-600" size={24}/> AI Multi-Key Status
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Giám sát hiệu năng & Sức khỏe API Key thời gian thực</p>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="py-6 pl-8 text-left">Trạng thái / Tên Key</th>
                                <th className="py-6 text-left">Loại</th>
                                <th className="py-6 text-center">Lưu lượng</th>
                                <th className="py-6 text-center">Lỗi</th>
                                <th className="py-6 text-center">Tỷ lệ Lỗi</th>
                                <th className="py-6 text-center">Độ trễ</th>
                                <th className="py-6 pr-8 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {keys.map((k: any) => {
                                const failRate = k.usage_count > 0 ? ((k.fail_count / k.usage_count) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-6 pl-8">
                                            <div className="flex flex-col items-center gap-2 w-fit">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-4 border-white shadow-md flex items-center justify-center",
                                                    k.status === 'active' ? "bg-emerald-500 shadow-emerald-200 animate-pulse" :
                                                    k.status === 'probing' ? "bg-amber-400 shadow-amber-100" :
                                                    k.status === 'disabled' ? "bg-slate-300 shadow-slate-100" :
                                                    "bg-red-500 shadow-red-200"
                                                )}>
                                                    {k.status === 'active' && <Zap size={8} className="text-white fill-white"/>}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{k.name}</p>
                                                    <p className={cn(
                                                        "text-[7px] font-black uppercase mt-1 tracking-widest",
                                                        k.status === 'active' ? "text-emerald-500" :
                                                        k.status === 'disabled' ? "text-slate-400" : "text-red-500"
                                                    )}>{k.status}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "text-[9px] font-black px-2 py-0.5 rounded-md w-fit uppercase",
                                                    k.name.includes('Ge') ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"
                                                )}>{k.name.includes('Ge') ? 'gemini' : 'deepseek'}</span>
                                                {k.last_error && k.status === 'error' && (
                                                    <p className="text-[8px] text-red-500 font-bold italic line-clamp-1 max-w-[120px]" title={k.last_error}>
                                                        ⚠ {k.last_error}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-6 text-center text-xs font-black text-slate-600">{k.usage_count || 0}</td>
                                        <td className="py-6 text-center text-xs font-black text-red-500">{k.error_count || 0}</td>
                                        <td className="py-6 text-center">
                                            <div className={cn(
                                                "inline-block px-2 py-0.5 rounded-full text-[10px] font-black border",
                                                Number(failRate) < 5 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                            )}>{failRate}%</div>
                                        </td>
                                        <td className="py-6 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Zap size={10} className="text-amber-400 fill-amber-400"/>
                                                <span className="text-xs font-black text-slate-700">{k.avg_latency || '---'}ms</span>
                                            </div>
                                        </td>
                                        <td className="py-6 pr-8 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleAction(k.db_id || k.id, 'reset')}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Reset lỗi & Cooldown"
                                                >
                                                    <RefreshCcw size={14}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(k.db_id || k.id, 'toggle')}
                                                    className={cn(
                                                        "p-2 rounded-xl transition-all shadow-sm",
                                                        k.status === 'disabled' ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white" : "bg-red-50 text-red-500 hover:bg-red-600 hover:text-white"
                                                    )}
                                                    title={k.status === 'disabled' ? "Bật Key" : "Tắt Key"}
                                                >
                                                    <Power size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <button onClick={onSave} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-black transition-all text-sm uppercase flex items-center justify-center gap-3">
                <ShieldCheck size={20}/> Lưu tất cả cấu hình API
            </button>
        </div>
    );
}

/**
 * 📡 VIEW 2: LOGS VIEW (RADAR ERROR TRACKING)
 */
export function LogsView({ errorLogs }: any) {
    if (!errorLogs || errorLogs.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] p-20 border border-slate-100 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="text-slate-300" size={32}/>
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Radar đang sạch bóng lỗi</h3>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500"/> Nhật ký lỗi (Radar)
                </h2>
                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {errorLogs.length} LOGS
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {errorLogs.map((log: any) => (
                    <div key={log.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group relative overflow-hidden">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                                        log.file_source === 'fb_webhook' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-red-50 text-red-700 border-red-100"
                                    )}>{log.file_source || 'SYSTEM'}</span>
                                    {log.shops && <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-widest">#{log.shops.code}</span>}
                                </div>
                                <p className="text-xs font-bold text-slate-700 line-clamp-2">{log.error_message}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 flex items-center justify-end gap-1 mb-1">
                                    <Clock size={12}/> {new Date(log.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <p className="text-[9px] font-bold text-slate-300">{new Date(log.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * ⚙️ VIEW 3: SETTINGS VIEW (SYSTEM CONFIG)
 */
export function SettingsView({ trialTemplateCode, setTrialTemplateCode, onSave }: any) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl"><Settings size={28}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase">Cấu hình Hệ thống</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Quản lý trải nghiệm người dùng & Trial</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <Package className="text-indigo-600" size={20}/>
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Gói dùng thử mặc định (Trial)</h3>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Nhập mã gói tri thức (Mặc định)</label>
                            <input 
                                type="text" 
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                placeholder="Ví dụ: RETAIL_FREE"
                                value={trialTemplateCode}
                                onChange={e => setTrialTemplateCode(e.target.value)}
                            />
                            <p className="text-[9px] text-slate-400 mt-3 italic">Hệ thống sẽ nạp gói này cho mọi shop mới đăng ký dùng thử.</p>
                        </div>
                    </div>

                    <button 
                        onClick={onSave}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-black transition-all text-sm uppercase flex items-center justify-center gap-3"
                    >
                        <ShieldCheck size={20}/> Cập nhật cấu hình hệ thống
                    </button>
                </div>
            </div>
        </div>
    );
}
