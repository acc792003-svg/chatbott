import { Brain, Lock, Settings, AlertTriangle, Info, RefreshCcw, Power, ShieldCheck, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function ApiKeysView({
    showKeys, setShowKeys, 
    apiKey1, setApiKey1, 
    apiKey2, setApiKey2, 
    apiKeyPro, setApiKeyPro, 
    deepSeekKeyFree1, setDeepSeekKeyFree1,
    deepSeekKeyFree2, setDeepSeekKeyFree2,
    deepSeekKeyPro, setDeepSeekKeyPro,
    fbVerifyToken, setFbVerifyToken,
    fbAppSecret, setFbAppSecret,
    systemTelegramToken, setSystemTelegramToken,
    systemStats, onSave, addToast
}: any) {

    const handleKeyAction = async (keyId: string, action: 'reset' | 'disable' | 'active' | 'force_cooldown') => {
        if (!keyId) return;
        try {
            const updates: any = {};
            if (action === 'reset') {
                updates.fail_count = 0;
                updates.status = 'active';
                updates.cooldown_until = null;
            } else if (action === 'disable') {
                updates.status = 'disabled';
            } else if (action === 'active') {
                updates.status = 'active';
            } else if (action === 'force_cooldown') {
                const date = new Date();
                date.setMinutes(date.getMinutes() + 15);
                updates.cooldown_until = date.toISOString();
                updates.status = 'error';
            }

            const { error } = await supabase.from('system_settings').update(updates).eq('id', keyId);
            if (error) throw error;
            addToast(`Đã ${action === 'reset' ? 'khởi động lại' : action === 'disable' ? 'vô hiệu hóa' : 'cập nhật'} Key`, 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* 🎯 PHẦN 1: BẢNG CHI TIẾT SỨC KHỎE KEY (NEW) */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 border border-white overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl">
                            <Activity size={28}/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent uppercase tracking-tight">AI Key Monitor</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Theo dõi hiệu suất & sức khỏe thời gian thực</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-10 px-10">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="pb-4 pl-4">Tên Key</th>
                                <th className="pb-4">Loại</th>
                                <th className="pb-4">Trạng thái</th>
                                <th className="pb-4 text-center">Calls</th>
                                <th className="pb-4 text-center">Lỗi</th>
                                <th className="pb-4 text-center">Tỷ lệ</th>
                                <th className="pb-4 text-center">Độ trễ</th>
                                <th className="pb-4">Dùng cuối</th>
                                <th className="pb-4 text-right pr-4">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(systemStats?.keys || []).map((k: any) => {
                                const failRate = k.usage_count > 0 ? (k.error_count / k.usage_count * 100).toFixed(1) : '0';
                                const isCooldown = k.status === 'error' || (k.cooldown_until && new Date(k.cooldown_until) > new Date());
                                
                                return (
                                    <tr key={k.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                        <td className="py-5 pl-4 rounded-l-2xl border-y border-l border-slate-100">
                                            <p className="text-xs font-black text-slate-800 uppercase">{k.name}</p>
                                            {k.last_error && (
                                                <p className="text-[8px] text-red-500 font-bold italic mt-0.5 line-clamp-1 max-w-[120px]" title={k.last_error}>
                                                    ⚠ {k.last_error}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-5 border-y border-slate-100">
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded-md uppercase",
                                                k.provider === 'gemini' ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"
                                            )}>{k.provider}</span>
                                        </td>
                                        <td className="py-5 border-y border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    k.status === 'active' ? "bg-emerald-500 animate-pulse" :
                                                    k.status === 'probing' ? "bg-amber-400" :
                                                    k.status === 'disabled' ? "bg-slate-400" : "bg-red-500"
                                                )}></div>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase",
                                                    k.status === 'active' ? "text-emerald-700" :
                                                    k.status === 'probing' ? "text-amber-700" :
                                                    k.status === 'disabled' ? "text-slate-500" : "text-red-700"
                                                )}>
                                                    {isCooldown ? 'COOLDOWN' : k.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 border-y border-slate-100 text-center text-xs font-bold text-slate-600">{k.usage_count || 0}</td>
                                        <td className="py-5 border-y border-slate-100 text-center text-xs font-bold text-red-500">{k.error_count || 0}</td>
                                        <td className="py-5 border-y border-slate-100 text-center">
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-0.5 rounded border",
                                                Number(failRate) < 3 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                                                Number(failRate) < 10 ? "text-amber-600 bg-amber-50 border-amber-100" :
                                                "text-red-600 bg-red-50 border-red-100"
                                            )}>{failRate}%</span>
                                        </td>
                                        <td className="py-5 border-y border-slate-100 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Zap size={10} className="text-amber-400"/>
                                                <span className="text-xs font-black text-slate-700">{k.avg_latency || '---'}ms</span>
                                            </div>
                                        </td>
                                        <td className="py-5 border-y border-slate-100 text-[10px] font-bold text-slate-400">
                                            {k.last_used_at ? new Date(k.last_used_at).toLocaleTimeString('vi-VN') : 'Chưa dùng'}
                                        </td>
                                        <td className="py-5 pr-4 rounded-r-2xl border-y border-r border-slate-100 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleKeyAction(k.db_id, 'reset')} title="Reset lỗi" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><RefreshCcw size={14}/></button>
                                                <button 
                                                    onClick={() => handleKeyAction(k.db_id, k.status === 'disabled' ? 'active' : 'disable')} 
                                                    title={k.status === 'disabled' ? "Kích hoạt" : "Vô hiệu hóa"}
                                                    className={cn("p-2 rounded-lg transition-all", k.status === 'disabled' ? "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:text-red-600 hover:bg-red-50")}
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

            {/* 🎯 PHẦN 2: Ô NHẬP KEY (GỌN GÀNG HƠN) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 border border-white h-fit">
                    <div className="space-y-12">
                        {/* GEMINI SECTION */}
                        <div>
                            <h2 className="text-sm font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-8 flex items-center gap-2"><Brain size={16} className="text-indigo-600"/> AI Service Keys (Gemini)</h2>
                            <div className="space-y-6">
                                {[
                                    {id: 'k1', label: 'Gemini Free 1', val: apiKey1, set: setApiKey1}, 
                                    {id: 'k2', label: 'Gemini Free 2', val: apiKey2, set: setApiKey2}, 
                                    {id: 'kp', label: 'Gemini PRO', val: apiKeyPro, set: setApiKeyPro}
                                ].map((k: any) => (
                                    <div key={k.id} className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-700 uppercase">{k.label}</label>
                                            <button onClick={() => setShowKeys({...showKeys, [k.id]: !showKeys[k.id]})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys[k.id] ? 'Ẩn' : 'Hiện'}</button>
                                        </div>
                                        <input type={showKeys[k.id] ? "text" : "password"} value={k.val} onChange={e => k.set(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-mono text-xs outline-none focus:border-indigo-600 transition-all" placeholder={`${k.label} token...`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DEEPSEEK SECTION */}
                        <div className="pt-8 border-t border-slate-100">
                            <h2 className="text-sm font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-8 flex items-center gap-2"><Settings size={16} className="text-blue-600"/> AI Service Keys (DeepSeek)</h2>
                            <div className="space-y-6">
                                {[
                                    {id: 'ds1', label: 'DeepSeek Free 1', val: deepSeekKeyFree1, set: setDeepSeekKeyFree1}, 
                                    {id: 'ds2', label: 'DeepSeek Free 2', val: deepSeekKeyFree2, set: setDeepSeekKeyFree2}, 
                                    {id: 'dsp', label: 'DeepSeek PRO', val: deepSeekKeyPro, set: setDeepSeekKeyPro}
                                ].map((k: any) => (
                                    <div key={k.id} className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-700 uppercase">{k.label}</label>
                                            <button onClick={() => setShowKeys({...showKeys, [k.id]: !showKeys[k.id]})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys[k.id] ? 'Ẩn' : 'Hiện'}</button>
                                        </div>
                                        <input type={showKeys[k.id] ? "text" : "password"} value={k.val} onChange={e => k.set(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-mono text-xs outline-none focus:border-blue-600 transition-all" placeholder={`${k.label} token...`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 border border-white flex flex-col justify-between h-fit">
                    <div>
                        <h2 className="text-sm font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-8 flex items-center gap-2"><Lock size={16} className="text-slate-700"/> Webhook & Security</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-700 uppercase leading-none">FB Webhook Verify Token</label>
                                    <button onClick={() => setShowKeys({...showKeys, fb: !showKeys.fb})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys.fb ? 'Ẩn' : 'Hiện'}</button>
                                </div>
                                <input type={showKeys.fb ? "text" : "password"} value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-xs outline-none focus:border-indigo-600" placeholder="Verify Token cho Webhook FB..." />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-700 uppercase">Facebook App Secret</label>
                                    <button onClick={() => setShowKeys({...showKeys, fbs: !showKeys.fbs})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys.fbs ? 'Ẩn' : 'Hiện'}</button>
                                </div>
                                <input type={showKeys.fbs ? "text" : "password"} value={fbAppSecret} onChange={e => setFbAppSecret(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-xs outline-none focus:border-indigo-600" placeholder="Facebook App Secret..." />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-700 uppercase">System Telegram Bot Token (Fallback)</label>
                                    <button onClick={() => setShowKeys({...showKeys, stg: !showKeys.stg})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys.stg ? 'Ẩn' : 'Hiện'}</button>
                                </div>
                                <input type={showKeys.stg ? "text" : "password"} value={systemTelegramToken} onChange={e => setSystemTelegramToken(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-xs outline-none focus:border-indigo-600" placeholder="Bot Token dự phòng toàn hệ thống..." />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-12">
                        <button onClick={onSave} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-5 rounded-3xl shadow-[0_15px_30px_-10px_rgba(79,70,229,0.6)] hover:shadow-[0_15px_40px_-10px_rgba(79,70,229,0.8)] hover:scale-[1.01] transition-all text-sm uppercase flex items-center justify-center gap-3">
                            <ShieldCheck size={20}/> CẬP NHẬT TOÀN BỘ API
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LogsView({errorLogs}: any) {
    return (
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-red-100/50 border border-white animate-in fade-in duration-500 min-h-[500px] mb-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-400/5 rounded-full blur-3xl -z-10"></div>
            <div className="flex items-center justify-between mb-10">
                <h2 className="text-lg font-black bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent uppercase flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><AlertTriangle size={18}/></div> 
                    Chatbot Radar <span className="text-[10px] text-slate-400 font-bold ml-2 hidden md:inline">(System Traces)</span>
                </h2>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-black bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full uppercase shadow-sm">Tracking</span>
                </div>
            </div>
            <div className="space-y-3">
                {errorLogs.length === 0 && <p className="text-center py-10 text-slate-500 font-bold italic">Chưa có ghi nhận lỗi nào...</p>}
                {errorLogs.map((l: any) => (
                    <div key={l.id} className={cn(
                        "p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all",
                        l.type === 'critical' ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100"
                    )}>
                        <div className="flex items-center gap-4 flex-1">
                            <span className={cn(
                                "px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap border shadow-sm",
                                l.type === 'critical' ? "bg-white text-red-600 border-red-200" : 
                                (l.shops?.code || l.metadata?.shopCode) ? `bg-amber-100 text-amber-600 border-amber-200` : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                {l.shops?.code ? `#${l.shops.code}` : (l.metadata?.shopCode ? `#${l.metadata.shopCode}` : (l.type === 'critical' ? 'CRITICAL' : 'SYSTEM'))}
                            </span>
                            
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {l.shops && <span className="text-[10px] font-black text-slate-500 uppercase">{l.shops.name}</span>}
                                    {l.file_source && <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{l.file_source}</span>}
                                </div>
                                <span className={cn(
                                    "text-xs font-bold leading-relaxed block",
                                    l.type === 'critical' ? "text-red-700" : "text-slate-700"
                                )}>
                                    {l.error_message}
                                </span>
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                            {new Date(l.created_at).toLocaleString('vi-VN')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SettingsView({trialTemplateCode, setTrialTemplateCode, onSave}: any) {
    return (
        <div className="max-w-xl bg-white/80 backdrop-blur-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl shadow-indigo-100/50 border border-white mb-20 mx-auto">
            <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center rounded-2xl shadow-lg"><Settings size={20}/></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">GLOBAL CONFIG</h2>
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Hệ thống cốt lõi</p>
                </div>
            </div>
            
            <div className="space-y-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest pl-1">Shop Mẫu (Auto-Inherit)</label>
                    <p className="text-[10px] text-slate-500 italic mb-2 pl-1">Mã shop này sẽ được dùng làm khuôn mẫu tri thức cho các shop mới tạo.</p>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-3xl font-black text-slate-900 uppercase focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-inner text-center" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value)} placeholder="MÃ SHOP..." />
                </div>
                <button onClick={onSave} className="w-full bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-widest mt-4">
                    LƯU CÀI ĐẶT CHUNG
                </button>
            </div>
        </div>
    );
}
