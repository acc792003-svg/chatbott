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
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 h-fit">
                <h2 className="text-sm font-black uppercase text-indigo-600 mb-8 flex items-center gap-2"><Brain size={16}/> AI Service Keys (Gemini)</h2>
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

            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                    <h2 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-2"><Lock size={16}/> Webhook & Security</h2>
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
                    <button onClick={onSave} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all text-sm uppercase flex items-center justify-center gap-3">
                        <Settings size={20}/> LƯU CẤU HÌNH API
                    </button>
                </div>
            </div>
        </div>
    );
}

export function LogsView({errorLogs}: any) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in duration-500 min-h-[500px] mb-20">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><AlertTriangle size={16}/> Chatbot Radar (Dấu vết hệ thống)</h2>
                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">Realtime Monitor ON</span>
            </div>
            <div className="space-y-3">
                {errorLogs.length === 0 && <p className="text-center py-10 text-slate-300 font-bold italic">Chưa có ghi nhận lỗi nào...</p>}
                {errorLogs.map((l: any) => (
                    <div key={l.id} className={cn(
                        "p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all",
                        l.type === 'critical' ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100"
                    )}>
                        <div className="flex items-center gap-4 flex-1">
                            <span className={cn(
                                "px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap border",
                                l.type === 'critical' ? "bg-red-600 text-white border-red-700" : 
                                (l.shops?.code || l.metadata?.shopCode) ? `bg-amber-100 text-amber-600 border-amber-200` : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                {l.type === 'critical' ? 'CRITICAL' : (l.shops?.code ? `#${l.shops.code}` : (l.metadata?.shopCode ? `#${l.metadata.shopCode}` : 'Shop Widget'))}
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
        <div className="max-w-xl bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 mb-20">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-2"><Settings size={16}/> Global Config</h2>
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Shop Mẫu (Auto-Inherit)</label>
                    <p className="text-[10px] text-slate-400 italic mb-2">Mã shop này sẽ được dùng làm khuôn mẫu tri thức cho các shop mới tạo.</p>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-3xl font-black text-slate-900 uppercase focus:border-indigo-600 outline-none" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value)} />
                </div>
                <button onClick={onSave} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-indigo-600 transition-all text-sm uppercase">
                    LƯU CÀI ĐẶT CHUNG
                </button>
            </div>
        </div>
    );
}
