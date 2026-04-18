import { Brain, Lock, Settings, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ApiKeysView({
    showKeys, setShowKeys, 
    apiKey1, setApiKey1, 
    apiKey2, setApiKey2, 
    apiKeyPro, setApiKeyPro, 
    fbVerifyToken, setFbVerifyToken,
    fbAppSecret, setFbAppSecret,
    systemTelegramToken, setSystemTelegramToken,
    systemStats, onSave
}: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 border border-white h-fit">
                <h2 className="text-sm font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-8 flex items-center gap-2"><Brain size={16} className="text-indigo-600"/> AI Service Keys (Gemini)</h2>
                <div className="space-y-8">
                    {[
                        {id: 'k1', label: 'Gemini Free 1', val: apiKey1, set: setApiKey1}, 
                        {id: 'k2', label: 'Gemini Free 2', val: apiKey2, set: setApiKey2}, 
                        {id: 'kp', label: 'Gemini PRO', val: apiKeyPro, set: setApiKeyPro}
                    ].map((k: any) => {
                        const stats = systemStats?.keys?.find((sk: any) => {
                            const targetName = k.label.includes('PRO') ? 'Key PRO' : k.label.includes('1') ? 'Key 1' : 'Key 2';
                            return sk.name === targetName;
                        });
                        return (
                            <div key={k.id} className="space-y-2 relative group">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2">
                                        {k.label}
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] border font-black",
                                            (!stats || stats.status === 'missing') ? "bg-slate-100 text-slate-600 border-slate-200" :
                                            stats.status === 'healthy' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                            stats.status === 'cooldown' ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" : 
                                            "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {(!stats || stats.status === 'missing') ? 'MISSING' : stats.status.toUpperCase()}
                                        </span>
                                    </label>
                                    <button onClick={() => setShowKeys({...showKeys, [k.id]: !showKeys[k.id]})} className="text-[10px] text-indigo-700 font-black uppercase underline">{showKeys[k.id] ? 'Ẩn' : 'Hiện'}</button>
                                </div>
                                <input type={showKeys[k.id] ? "text" : "password"} value={k.val} onChange={e => k.set(e.target.value)} className={cn("w-full bg-slate-50 border-2 rounded-xl p-4 font-mono text-xs outline-none transition-all", stats?.status === 'error' ? "border-red-200 focus:border-red-600" : "border-slate-200 focus:border-indigo-600")} placeholder={`${k.label} token...`} />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 border border-white flex flex-col justify-between">
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
                
                <div className="mt-8">
                    <button onClick={onSave} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-5 rounded-3xl shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_20px_-5px_rgba(79,70,229,0.8)] hover:scale-[1.01] transition-all text-sm uppercase flex items-center justify-center gap-3">
                        <Settings size={20}/> LƯU CẤU HÌNH API
                    </button>
                </div>
            </div>
        </div>
    );
}

export function LogsView({errorLogs}: any) {
    return (
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl shadow-red-100/50 border border-white animate-in fade-in duration-500 min-h-[500px] mb-20 relative overflow-hidden">
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
        <div className="max-w-xl bg-white/80 backdrop-blur-2xl rounded-[3rem] p-12 shadow-2xl shadow-indigo-100/50 border border-white mb-20 mx-auto">
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
