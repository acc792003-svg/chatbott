import React, { useState } from 'react';
import { 
    Brain, Lock, Settings, AlertTriangle, Info, RefreshCcw, 
    Power, ShieldCheck, Zap, Activity, ShieldAlert, Copy,
    CheckCircle, MessageCircle, Package, Send, Edit2, Square, CheckSquare, Trash2, Layers,
    Clock, Search, Filter, Eye, EyeOff, X, TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Native concurrency queue
const runWithLimit = async (tasks: any[], limit = 3) => {
    const results: Promise<any>[] = [];
    const executing: Promise<any>[] = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit <= tasks.length) {
            let e: Promise<any>;
            e = p.then(() => {
                const index = executing.indexOf(e);
                if (index > -1) executing.splice(index, 1);
            });
            executing.push(e);
            if (executing.length >= limit) await Promise.race(executing);
        }
    }
    return Promise.all(results);
};

/**
 * 📈 MINI SPARKLINE COMPONENT
 */
function Sparkline({ data, color = "#6366f1" }: { data: number[], color?: string }) {
    if (!data || data.length < 2) return <div className="w-16 h-4 bg-slate-100 rounded-full opacity-30" />;
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((d - min) / range) * height
    }));

    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
        <div className="w-20 h-6">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

/**
 * 📊 VIEW 1: RADAR AI HEALTH DASHBOARD
 */
export function ApiKeysView({
    systemStats, onSave, addToast,
    apiKey1, setApiKey1, 
    apiKey2, setApiKey2, 
    apiKeyPro, setApiKeyPro, 
    deepSeekKeyFree1, setDeepSeekKeyFree1,
    deepSeekKeyFree2, setDeepSeekKeyFree2,
    deepSeekKeyPro, setDeepSeekKeyPro,
    openRouterKey1, setOpenRouterKey1,
    openRouterKey2, setOpenRouterKey2,
    openRouterModel, setOpenRouterModel,
    openRouterModelPro, setOpenRouterModelPro,
    fbVerifyToken, setFbVerifyToken,
    fbAppSecret, setFbAppSecret,
    systemTelegramToken, setSystemTelegramToken,
    adminTelegramChatId, setAdminTelegramChatId,
    showKeys, setShowKeys
}: any) {
    const keys = systemStats?.keys || [];
    const metrics = systemStats?.metrics || { total_messages_24h: 0, cache_hit_rate: 0 };
    
    // Sort & Filter States
    const [sortBy, setSortBy] = useState<'latency' | 'usage' | 'fail'>('latency');
    const [filterProvider, setFilterProvider] = useState<'all' | 'gemini' | 'deepseek' | 'openrouter'>('all');
    
    const sortedKeys = [...keys]
        .filter(k => {
            if (filterProvider === 'all') return true;
            const keyLower = k.key.toLowerCase();
            const nameLower = k.name.toLowerCase();
            if (filterProvider === 'gemini') return keyLower.includes('gemini');
            if (filterProvider === 'deepseek') return keyLower.includes('deepseek');
            if (filterProvider === 'openrouter') return keyLower.includes('openrouter') || nameLower.includes('openrouter') || nameLower.includes('or ');
            return true;
        })
        .sort((a: any, b: any) => {
            if (sortBy === 'latency') return (a.avg_latency || 9999) - (b.avg_latency || 9999);
            if (sortBy === 'usage') return (b.usage_count || 0) - (a.usage_count || 0);
            if (sortBy === 'fail') return (b.fail_count || 0) - (a.fail_count || 0);
            return 0;
        });

    // Modal State
    const [selectedKey, setSelectedKey] = useState<any>(null);
    const [keyHistory, setKeyHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const openDetails = async (key: any) => {
        setSelectedKey(key);
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/admin/system/keys/history?id=${key.id}`);
            const data = await res.json();
            if (data.logs) setKeyHistory(data.logs);
        } catch (e) {}
        setLoadingHistory(false);
    };

    // Testing State
    const [testingMap, setTestingMap] = useState<Record<string, boolean>>({});
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [testingAll, setTestingAll] = useState(false);

    const testKey = async (key: any) => {
        setTestingMap(p => ({ ...p, [key.id]: true }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/admin/test-key', {
                method: 'POST',
                headers,
                body: JSON.stringify({ keyStr: key.key })
            });
            const data = await res.json();
            setTestResults(p => ({ ...p, [key.id]: data }));
            
            if (data.status && res.ok) {
                await fetch('/api/admin/system/keys/update-health', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ keyStr: key.key, status: data.status, latency: data.latency })
                });
            }
        } catch (e) {
            setTestResults(p => ({ ...p, [key.id]: { status: 'error' } }));
        }
        setTestingMap(p => ({ ...p, [key.id]: false }));
    };

    const handleAction = async (id: string, action: 'reset' | 'toggle') => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/admin/system/keys/action', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();
            if (data.success) {
                addToast(action === 'reset' ? 'Đã reset trạng thái Key' : 'Đã thay đổi trạng thái Key', 'success');
            }
        } catch (e) {}
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 🔷 KHỐI 1: TỔNG QUAN (TOP RADAR) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-indigo-100/50 transition-all">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck size={80}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Nodes Health
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-900">{keys.filter((k:any) => k.status === 'active').length}</h3>
                        <span className="text-[10px] font-bold text-slate-400">/ {keys.length} Active</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-rose-100/50 transition-all">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle size={80}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Errors</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-rose-600">{keys.filter((k:any) => k.status === 'error').length}</h3>
                        <span className="text-[10px] font-bold text-slate-400">Critical Alerts</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-blue-100/50 transition-all">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><Activity size={80}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Latency</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-indigo-600">
                            {(keys.reduce((acc: number, k: any) => acc + (k.avg_latency || 0), 0) / (keys.filter((k: any) => k.avg_latency > 0).length || 1) / 1000).toFixed(2)}s
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">Real-time</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-emerald-100/50 transition-all">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform"><Zap size={80}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-emerald-600">{metrics.cache_hit_rate}%</h3>
                        <span className="text-[10px] font-bold text-slate-400">Cache Save</span>
                    </div>
                </div>
            </div>

            {/* 🔷 KHỐI 2: BẢNG KEY CHUYÊN SÂU */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <Activity className="text-indigo-600" size={24}/> Radar AI Health Dashboard
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Giám sát hiệu năng & Sức khỏe API Key đa tầng</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {/* Filters & Sorting */}
                        <select 
                            value={filterProvider} onChange={(e) => setFilterProvider(e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả Provider</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>

                        <select 
                            value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="latency">Sắp xếp: Độ trễ</option>
                            <option value="usage">Sắp xếp: Lưu lượng</option>
                            <option value="fail">Sắp xếp: Số lỗi</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                                <th className="py-6 pl-8 text-left">Node / Status</th>
                                <th className="py-6 text-center">Trend</th>
                                <th className="py-6 text-center">Metrics</th>
                                <th className="py-6 text-center">Error Health</th>
                                <th className="py-6 text-center">Performance</th>
                                <th className="py-6 pr-8 text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedKeys.map((k: any) => {
                                const failRate = k.usage_count > 0 ? ((k.fail_count / k.usage_count) * 100).toFixed(1) : 0;
                                const currentStatus = testResults[k.id]?.status || k.status;
                                const displayLatency = testResults[k.id]?.latency || k.avg_latency || 0;
                                
                                return (
                                    <motion.tr 
                                        key={k.id} 
                                        onClick={() => openDetails(k)}
                                        whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                                        className={cn(
                                            "group cursor-pointer transition-all",
                                            currentStatus === 'error' ? "animate-pulse border-l-4 border-l-rose-500" : "border-l-4 border-l-transparent"
                                        )}
                                    >
                                        <td className="py-6 pl-8">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center shrink-0 transition-all",
                                                    currentStatus === 'active' ? "bg-emerald-500 shadow-emerald-100" :
                                                    currentStatus === 'probing' ? "bg-amber-400 shadow-amber-100" :
                                                    currentStatus === 'disabled' ? "bg-slate-200 shadow-slate-50" :
                                                    "bg-rose-500 shadow-rose-100"
                                                )}>
                                                    {currentStatus === 'active' ? <Zap size={18} className="text-white fill-white"/> : 
                                                     currentStatus === 'disabled' ? <Power size={18} className="text-slate-400"/> :
                                                     <AlertTriangle size={18} className="text-white"/>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-2">{k.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase border", 
                                                            k.key.includes('gemini') ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                                            k.key.includes('deepseek') ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        )}>
                                                            {k.key.includes('gemini') ? 'gemini' : k.key.includes('deepseek') ? 'deepseek' : 'openrouter'}
                                                        </span>
                                                        <span className={cn("text-[8px] font-black uppercase tracking-widest", 
                                                            currentStatus === 'active' ? "text-emerald-500" : "text-rose-500"
                                                        )}>{currentStatus}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <Sparkline data={[1200, 1500, 900, 1100, 2000, 1300, displayLatency]} color={displayLatency > 3000 ? "#f43f5e" : "#6366f1"} />
                                                <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Latency Trend</span>
                                            </div>
                                        </td>

                                        <td className="py-6 text-center">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-black text-slate-700 flex items-center justify-center gap-1">
                                                    <Activity size={12} className="text-slate-400"/> {k.usage_count}
                                                </div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Total Usage</p>
                                            </div>
                                        </td>

                                        <td className="py-6 text-center">
                                            <div className="flex flex-col gap-1">
                                                <div className={cn("text-xs font-black flex items-center justify-center gap-1", Number(failRate) > 5 ? "text-rose-500" : "text-emerald-500")}>
                                                    <AlertTriangle size={12}/> {k.fail_count} <span className="text-[9px] opacity-70">({failRate}%)</span>
                                                </div>
                                                {currentStatus === 'error' && (
                                                    <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter" title={k.last_error}>
                                                        ⚠ {k.last_error_type || 'Error'}
                                                    </p>
                                                )}
                                                {k.cooldown_until && new Date(k.cooldown_until) > new Date() && (
                                                    <div className="flex items-center justify-center gap-1 text-slate-400 animate-pulse">
                                                        <Clock size={10}/>
                                                        <span className="text-[8px] font-bold">-{Math.ceil((new Date(k.cooldown_until).getTime() - Date.now()) / 60000)}m</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-6 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className={cn(
                                                    "flex items-center gap-1.5 border rounded-xl py-1.5 px-3",
                                                    displayLatency > 0 && displayLatency < 1500 ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                                    displayLatency >= 1500 && displayLatency <= 3000 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-rose-50 border-rose-100 text-rose-700"
                                                )}>
                                                    <Zap size={12} className={cn("fill-current", displayLatency < 1500 ? "text-emerald-500" : "text-amber-500")}/>
                                                    <span className="text-[11px] font-black">{displayLatency || '---'}ms</span>
                                                </div>
                                                <span className={cn("text-[8px] font-black uppercase", displayLatency < 1500 ? "text-emerald-500" : "text-amber-500")}>
                                                    {displayLatency < 1500 ? 'Fast' : displayLatency < 3000 ? 'Normal' : 'Slow'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="py-6 pr-8 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => testKey(k)} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all border border-indigo-100 shadow-sm"><Zap size={14}/></button>
                                                {!k.is_env && (
                                                    <>
                                                        <button onClick={() => handleAction(k.id, 'reset')} className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all border border-slate-200"><RefreshCcw size={14}/></button>
                                                        <button onClick={() => handleAction(k.id, 'toggle')} className={cn("p-2.5 rounded-xl transition-all border", k.status === 'disabled' ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600" : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600")}><Power size={14}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🔷 KHỐI 3: API CONFIGURATION INPUTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-10 border-t border-slate-100">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 mb-2"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Brain size={20}/></div><h3 className="text-sm font-black uppercase tracking-widest">Google Gemini</h3></div>
                    <KeyInput label="Gemini Free 1" value={apiKey1} onChange={setApiKey1} show={showKeys?.k1} toggle={() => setShowKeys({...showKeys, k1: !showKeys?.k1})} />
                    <KeyInput label="Gemini Free 2" value={apiKey2} onChange={setApiKey2} show={showKeys?.k2} toggle={() => setShowKeys({...showKeys, k2: !showKeys?.k2})} />
                    <KeyInput label="Gemini Pro" value={apiKeyPro} onChange={setApiKeyPro} show={showKeys?.kp} toggle={() => setShowKeys({...showKeys, kp: !showKeys?.kp})} />
                </div>
                
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 mb-2"><div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Zap size={20}/></div><h3 className="text-sm font-black uppercase tracking-widest">DeepSeek</h3></div>
                    <KeyInput label="DeepSeek Free 1" value={deepSeekKeyFree1} onChange={setDeepSeekKeyFree1} show={showKeys?.ds1} toggle={() => setShowKeys({...showKeys, ds1: !showKeys?.ds1})} />
                    <KeyInput label="DeepSeek Free 2" value={deepSeekKeyFree2} onChange={setDeepSeekKeyFree2} show={showKeys?.ds2} toggle={() => setShowKeys({...showKeys, ds2: !showKeys?.ds2})} />
                    <KeyInput label="DeepSeek Pro" value={deepSeekKeyPro} onChange={setDeepSeekKeyPro} show={showKeys?.dsp} toggle={() => setShowKeys({...showKeys, dsp: !showKeys?.dsp})} />
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 mb-2"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Layers size={20}/></div><h3 className="text-sm font-black uppercase tracking-widest">OpenRouter</h3></div>
                    <KeyInput label="OpenRouter 1" value={openRouterKey1} onChange={setOpenRouterKey1} show={showKeys?.or1} toggle={() => setShowKeys({...showKeys, or1: !showKeys?.or1})} />
                    <KeyInput label="OpenRouter 2" value={openRouterKey2} onChange={setOpenRouterKey2} show={showKeys?.or2} toggle={() => setShowKeys({...showKeys, or2: !showKeys?.or2})} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Activity size={12}/> Model (FREE)</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black outline-none focus:border-emerald-500" value={openRouterModel || ''} onChange={e => setOpenRouterModel(e.target.value)} placeholder="Ví dụ: deepseek/deepseek-chat" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={12}/> Model (PRO)</label>
                            <input type="text" className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 text-xs font-black outline-none focus:border-indigo-500" value={openRouterModelPro || ''} onChange={e => setOpenRouterModelPro(e.target.value)} placeholder="Ví dụ: openai/gpt-4o" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 mb-2"><div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><Settings size={20}/></div><h3 className="text-sm font-black uppercase tracking-widest">FB & Telegram</h3></div>
                    <KeyInput label="FB Verify Token" value={fbVerifyToken} onChange={setFbVerifyToken} show={showKeys?.fbv} toggle={() => setShowKeys({...showKeys, fbv: !showKeys?.fbv})} />
                    <KeyInput label="FB App Secret" value={fbAppSecret} onChange={setFbAppSecret} show={showKeys?.fbs} toggle={() => setShowKeys({...showKeys, fbs: !showKeys?.fbs})} />
                    <KeyInput label="Telegram Token" value={systemTelegramToken} onChange={setSystemTelegramToken} show={showKeys?.tgt} toggle={() => setShowKeys({...showKeys, tgt: !showKeys?.tgt})} />
                    <KeyInput label="Admin Chat ID" value={adminTelegramChatId} onChange={setAdminTelegramChatId} show={showKeys?.tga} toggle={() => setShowKeys({...showKeys, tga: !showKeys?.tga})} />
                </div>
            </div>

            <button onClick={onSave} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-black transition-all text-sm uppercase flex items-center justify-center gap-3 mt-10">
                <ShieldCheck size={20}/> Deploy & Sync System Configuration
            </button>

            {/* 🔷 INTELLIGENCE POPUP (KEY DETAILS MODAL) */}
            <AnimatePresence>
                {selectedKey && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedKey(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white"
                        >
                            <div className="p-8 md:p-10">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl", selectedKey.status === 'active' ? "bg-emerald-500" : "bg-rose-500")}>
                                            <Brain size={32}/>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-2">{selectedKey.name}</h3>
                                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">{selectedKey.key}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedKey(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Success</p>
                                        <p className="text-xl font-black text-emerald-600">{selectedKey.usage_count - selectedKey.fail_count}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Failures</p>
                                        <p className="text-xl font-black text-rose-500">{selectedKey.fail_count}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Latency</p>
                                        <p className="text-xl font-black text-indigo-600">{selectedKey.avg_latency}ms</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <p className={cn("text-xl font-black uppercase", selectedKey.status === 'active' ? "text-emerald-500" : "text-rose-500")}>{selectedKey.status}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Clock size={14}/> Node Timeline (Last 20 Events)
                                    </h4>
                                    <div className="bg-slate-900 rounded-[2rem] p-6 h-64 overflow-y-auto custom-scrollbar space-y-4">
                                        {loadingHistory ? (
                                            <div className="h-full flex items-center justify-center"><Activity size={24} className="text-indigo-500 animate-spin"/></div>
                                        ) : keyHistory.length === 0 ? (
                                            <p className="text-center text-slate-600 text-xs py-10 font-bold">Radar chưa ghi nhận lịch sử cho node này.</p>
                                        ) : keyHistory.map((log: any, i: number) => (
                                            <div key={log.id} className="flex items-center justify-between border-l-2 border-slate-800 pl-4 py-1">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn("w-2 h-2 rounded-full", log.status === 'success' ? "bg-emerald-500" : "bg-rose-500")}></span>
                                                        <p className={cn("text-[10px] font-black uppercase", log.status === 'success' ? "text-emerald-500" : "text-rose-500")}>{log.status}</p>
                                                        {log.latency && <span className="text-[9px] text-slate-500 font-bold">({log.latency}ms)</span>}
                                                    </div>
                                                    {log.error_type && <p className="text-[9px] text-rose-400 font-bold uppercase tracking-tight">{log.error_type}</p>}
                                                </div>
                                                <p className="text-[8px] text-slate-600 font-black">{new Date(log.created_at).toLocaleTimeString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button onClick={() => { handleAction(selectedKey.id, 'reset'); setSelectedKey(null); }} className="bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                                        <RefreshCcw size={14}/> Reset Node
                                    </button>
                                    <button onClick={() => { handleAction(selectedKey.id, 'toggle'); setSelectedKey(null); }} className="bg-slate-100 text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase flex items-center justify-center gap-2">
                                        <Power size={14}/> {selectedKey.status === 'disabled' ? 'Enable' : 'Disable'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

/**
 * 📡 VIEW 2: LOGS VIEW (RADAR ERROR TRACKING)
 */
export function LogsView({ errorLogs }: any) {
    const [activeErrorTab, setActiveErrorTab] = useState<'all' | 'ai' | 'webhook' | 'system'>('all');
    const [visibleCount, setVisibleCount] = useState(8);

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

    const categorizedLogs = errorLogs.map((log: any) => {
        let category = 'system';
        if (log.file_source === 'fb_webhook' || log.error_type?.includes('FB_WEBHOOK')) {
            category = 'webhook';
        } else if (log.error_type?.includes('API_TEST') || log.error_type?.includes('KEY_MISSING') || log.error_type?.includes('AI_')) {
            category = 'ai';
        }
        return { ...log, category };
    });

    const filteredLogs = activeErrorTab === 'all' ? categorizedLogs : categorizedLogs.filter((l: any) => l.category === activeErrorTab);
    const displayedLogs = filteredLogs.slice(0, visibleCount);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                                <AlertTriangle size={20}/>
                            </div>
                            Nhật ký lỗi trung tâm
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Radar theo dõi và phân loại sự cố toàn hệ thống</p>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex flex-wrap gap-2 mb-8 bg-slate-50 p-2 rounded-2xl w-fit border border-slate-100">
                    {[
                        { id: 'all', label: 'TẤT CẢ', count: categorizedLogs.length },
                        { id: 'ai', label: 'AI & API KEY', count: categorizedLogs.filter((l:any) => l.category === 'ai').length },
                        { id: 'webhook', label: 'FACEBOOK WEBHOOK', count: categorizedLogs.filter((l:any) => l.category === 'webhook').length },
                        { id: 'system', label: 'HỆ THỐNG', count: categorizedLogs.filter((l:any) => l.category === 'system').length }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => {
                                setActiveErrorTab(tab.id as any);
                                setVisibleCount(8);
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                                activeErrorTab === tab.id ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            {tab.label} <span className={cn("px-1.5 py-0.5 rounded-md text-[9px]", activeErrorTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500")}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có lỗi nào trong mục này</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedLogs.map((log: any) => (
                                <div key={log.id} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                                                    log.category === 'webhook' ? "bg-blue-50 text-blue-700 border-blue-100" : 
                                                    log.category === 'ai' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                    "bg-red-50 text-red-700 border-red-100"
                                                )}>{log.error_type || log.file_source || 'SYSTEM'}</span>
                                                {log.shops && <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg uppercase tracking-widest">#{log.shops.code}</span>}
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">{log.error_message}</p>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 flex items-center gap-1 border-t border-slate-50 pt-4 mt-auto">
                                        <Clock size={12}/> {new Date(log.created_at).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {visibleCount < filteredLogs.length && (
                            <div className="flex justify-center mt-6">
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 8)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 hover:border-slate-300 flex items-center gap-2"
                                >
                                    Xem thêm ({filteredLogs.length - visibleCount} lỗi nữa) <span className="text-slate-400 text-[10px]">▼</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
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

function KeyInput({ label, value, onChange, show, toggle }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                <input 
                    type={show ? "text" : "password"}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black outline-none focus:border-indigo-500 transition-all"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                />
                <button 
                    onClick={toggle}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                    {show ? <EyeOff size={16} className="text-indigo-600"/> : <Eye size={16}/>}
                </button>
            </div>
        </div>
    );
}
