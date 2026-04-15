'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Key, AlertTriangle, Plus, Trash2, Search, CheckCircle, Settings, Database,
  ArrowRight, TrendingUp, BrainCircuit, Bot, LogIn, Edit2, Calendar, Layers, Eye, EyeOff,
  User, Lock, Image as ImageIcon, CheckSquare, Square, Package, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Shop = {
  id: string;
  name: string;
  code: string;
  plan: 'free' | 'pro';
  plan_expiry_date: string | null;
  created_at: string;
};

type KnowledgePackage = {
    id: string;
    industry_name: string;
    package_name: string; // Tên của gói dữ liệu cụ thể
    product_info: string;
    faq: string;
    insights: string;
    example_content: string;
};

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [apiKey1, setApiKey1] = useState('');
  const [apiKey2, setApiKey2] = useState('');
  const [apiKeyPro, setApiKeyPro] = useState('');
  const [fbVerifyToken, setFbVerifyToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'knowledge' | 'apikeys' | 'errors' | 'config'>('shops');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  // Shop Management
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const [openShopId, setOpenShopId] = useState<string | null>(null);

  // Knowledge Workshop
  const [rawContent, setRawContent] = useState('');
  const [targetCodes, setTargetCodes] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('nhẹ nhàng');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<any>(null);
  const [knowledgePackages, setKnowledgePackages] = useState<KnowledgePackage[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [pushingKnowledge, setPushingKnowledge] = useState(false);

  // System Config
  const [trialTemplateCode, setTrialTemplateCode] = useState('');

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setCurrentUserId(user.id);
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role === 'super_admin') {
      setIsSuperAdmin(true);
      fetchShops();
      fetchApiKeys();
      fetchErrorLogs();
      fetchTrialConfig();
      fetchKnowledgePackages();
    } else { setLoading(false); }
  };

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (data) setShops(data);
    setLoading(false);
  };

  const fetchKnowledgePackages = async () => {
    const { data } = await supabase.from('knowledge_templates').select('*').order('industry_name', { ascending: true });
    if (data) setKnowledgePackages(data);
  };

  const fetchErrorLogs = async () => {
    const { data } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setErrorLogs(data);
  };

  const fetchApiKeys = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      setApiKey1(data.find(d => d.key === 'gemini_api_key_1')?.value || '');
      setApiKey2(data.find(d => d.key === 'gemini_api_key_2')?.value || '');
      setApiKeyPro(data.find(d => d.key === 'gemini_api_key_pro')?.value || '');
      setFbVerifyToken(data.find(d => d.key === 'fb_verify_token')?.value || '');
    }
  };

  const fetchTrialConfig = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
    if (data) setTrialTemplateCode(data.value);
  };

  // ==================== ACTIONS ====================
  const handleCreateShop = async () => {
    if (!newShopName.trim()) return;
    setAddingShop(true);
    const code = 'SHOP-' + Math.floor(10000 + Math.random() * 90000);
    try {
      await supabase.from('shops').insert({ name: newShopName, code: code, plan: 'free' });
      setNewShopName(''); fetchShops();
    } catch (e) {} finally { setAddingShop(false); }
  };

  const handleUpdateExpiry = async (shopId: string, date: string) => {
    await supabase.from('shops').update({ plan_expiry_date: date || null }).eq('id', shopId);
    fetchShops();
  };

  const togglePlan = async (shop: Shop) => {
    const newPlan = shop.plan === 'free' ? 'pro' : 'free';
    const expiry = newPlan === 'pro' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null;
    await supabase.from('shops').update({ plan: newPlan, plan_expiry_date: expiry }).eq('id', shop.id);
    fetchShops();
  };

  const handleResetPassword = async (shopId: string) => {
    const pass = prompt('Mật khẩu mới:');
    if (!pass) return;
    const res = await fetch('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ shopId, newPassword: pass, requesterId: currentUserId }) });
    if (res.ok) alert('Thành công!');
  };

  const handleUpdateIcon = async (shopId: string, url: string) => {
    await supabase.from('chatbot_configs').update({ head_icon: url }).eq('shop_id', shopId);
    alert('Đã đổi icon!');
  };

  const handleProcessKnowledge = async () => {
    if (!rawContent.trim() || !industryName.trim() || !packageName.trim()) return alert('Thiếu thông tin nạp liệu!');
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/knowledge/process', { method: 'POST', body: JSON.stringify({ content: rawContent, voice: selectedVoice, requesterId: currentUserId }) });
      const data = await res.json();
      setProcessedResult(data.result);
    } catch (e) { alert('Lỗi xử lý!'); } finally { setIsProcessing(false); }
  };

  const handleSavePackage = async () => {
    if (!processedResult) return;
    await supabase.from('knowledge_templates').insert({
        industry_name: industryName,
        package_name: packageName, // Chèn vào cột industry_name theo template (cần logic gom nhóm)
        product_info: processedResult.product_info,
        faq: processedResult.faq,
        insights: processedResult.insights,
        example_content: rawContent
    });
    alert('Đã lưu gói dữ liệu!');
    setProcessedResult(null); fetchKnowledgePackages();
  };

  const handlePushMultiKnowledge = async () => {
    const codeList = targetCodes.trim().split(/\s+/).filter(c => c.length > 0);
    if (selectedPackageIds.length === 0 || codeList.length === 0) return alert('Chưa chọn gói dữ liệu hoặc mã shop!');
    setPushingKnowledge(true);
    try {
        const pkgs = knowledgePackages.filter(p => selectedPackageIds.includes(p.id));
        const combined = {
            product_info: pkgs.map(p => p.product_info).join('\n\n'),
            faq: pkgs.map(p => p.faq).join('\n\n'),
            insights: pkgs.map(p => p.insights).join('\n\n')
        };
        await fetch('/api/admin/knowledge/push', { method: 'POST', body: JSON.stringify({ codes: codeList, data: combined, voice: 'nhẹ nhàng', requesterId: currentUserId }) });
        alert('🚀 Đã xuất xưởng thành công!');
        setSelectedPackageIds([]); setTargetCodes('');
    } catch (e) { alert('Lỗi xuất xưởng!'); } finally { setPushingKnowledge(false); }
  };

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400">LOADING CORE...</div>;

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 p-3 md:p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* SMALL HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Settings size={20}/></div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">SUPER ADMIN</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Core Station v4.5</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Live</span>
          </div>
        </div>

        {/* COMPACT TABS */}
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6 w-fit">
          {[
            { id: 'shops', label: 'Shop', icon: <Users size={14}/> },
            { id: 'knowledge', label: 'Xưởng AI', icon: <BrainCircuit size={14}/> },
            { id: 'apikeys', label: 'API Keys', icon: <Key size={14}/> },
            { id: 'errors', label: 'Logs', icon: <AlertTriangle size={14}/> },
            { id: 'config', label: 'Cài đặt', icon: <Settings size={14}/> },
          ].map((tab) => (
            <button 
              key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all", activeTab === tab.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== TAB: SHOPS ==================== */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Action Row */}
            <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Tìm tên/mã shop..." className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:border-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <input type="text" placeholder="Tên shop mới..." className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                    <button onClick={handleCreateShop} disabled={addingShop} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700">+ TẠO</button>
                </div>
            </div>

            {/* Compact Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Shop Name & Code</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-24">Gói</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-32">Ngày hết hạn</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right w-24 pr-6">Setup</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())).map((shop) => (
                            <React.Fragment key={shop.id}>
                                <tr className="hover:bg-slate-50 transition-all">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-xs text-slate-600">{shop.name.charAt(0)}</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 leading-none mb-1">{shop.name}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-indigo-500 tracking-tighter uppercase">{shop.code}</span>
                                                    <button onClick={() => setOpenShopId(openShopId === shop.id ? null : shop.id)} className="text-slate-300 hover:text-indigo-600"><Settings size={12}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => togglePlan(shop)} className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase border", shop.plan === 'pro' ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
                                            {shop.plan}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <input type="date" className="bg-slate-50 border-none rounded-lg p-1.5 text-[10px] font-bold" value={shop.plan_expiry_date?.split('T')[0] || ''} onChange={e => handleUpdateExpiry(shop.id, e.target.value)} />
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <button onClick={() => { if(confirm('Xóa shop?')) supabase.from('shops').delete().eq('id', shop.id).then(() => fetchShops()) }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                                {/* Shop Config View - Directly Below */}
                                {openShopId === shop.id && (
                                    <tr className="bg-slate-900 text-white animate-in slide-in-from-top-2 duration-300">
                                        <td colSpan={4} className="p-4 pl-12 border-l-4 border-indigo-500">
                                            <div className="flex flex-wrap gap-8 py-2">
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Icon Bot</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUpdateIcon(shop.id, '/icons/bot-male.png')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[10px] font-bold">👨 Nam</button>
                                                        <button onClick={() => handleUpdateIcon(shop.id, '/icons/bot-female.png')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[10px] font-bold">👩 Nữ</button>
                                                        <button onClick={() => { const u = prompt('Link ảnh:'); if(u) handleUpdateIcon(shop.id, u); }} className="bg-white/10 p-2 rounded-lg text-[10px] font-bold">🔗 Custom</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 border-l border-white/10 pl-8">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tài khoản</p>
                                                    <button onClick={() => handleResetPassword(shop.id)} className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-[10px] font-black uppercase">Đổi mật khẩu</button>
                                                </div>
                                                <div className="space-y-2 border-l border-white/10 pl-8 flex-1">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Thông tin khác</p>
                                                    <p className="text-[10px] font-bold italic text-slate-400">Owner ID: {shop.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* ==================== TAB: KNOWLEDGE WORKSHOP ==================== */}
        {activeTab === 'knowledge' && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Col 1: Train & Create Package */}
            <div className="lg:w-1/2 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                 <div className="flex items-center gap-3 mb-4">
                    <BrainCircuit size={18} className="text-emerald-600"/>
                    <h2 className="text-sm font-black text-slate-900 uppercase">Input Nguyên liệu AI</h2>
                 </div>
                 <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">1. Tên Ngành (Category)</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" placeholder="VD: Yến Sào" value={industryName} onChange={e => setIndustryName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">2. Tên Gói Dữ Liệu</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" placeholder="VD: FAQ Chăm Sóc" value={packageName} onChange={e => setPackageName(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">3. Nội dung thô</label>
                        <textarea rows={8} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium" placeholder="Dán văn bản vào đây..." value={rawContent} onChange={e => setRawContent(e.target.value)}></textarea>
                    </div>
                    <button onClick={handleProcessKnowledge} disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg hover:bg-black transition-all">
                        {isProcessing ? 'AI Đang lọc...' : 'Luyện Tri Thức'}
                    </button>
                 </div>
                 {processedResult && (
                     <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between animate-bounce">
                         <span className="text-[10px] font-black text-emerald-700 uppercase">Thành phẩm đã sẵn sàng!</span>
                         <button onClick={handleSavePackage} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm">Lưu gói vào kho</button>
                     </div>
                 )}
              </div>
            </div>

            {/* Col 2: Select & Push */}
            <div className="lg:w-1/2 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Package size={18} className="text-indigo-600"/>
                        <h2 className="text-sm font-black text-slate-900 uppercase">Kho Gói Tri Thức</h2>
                    </div>
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">Đã chọn: {selectedPackageIds.length} gói</span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-1 custom-scrollbar">
                    {knowledgePackages.map(p => (
                        <div key={p.id} onClick={() => {
                            if(selectedPackageIds.includes(p.id)) setSelectedPackageIds(selectedPackageIds.filter(id => id !== p.id));
                            else setSelectedPackageIds([...selectedPackageIds, p.id]);
                        }} className={cn("p-3 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center group", selectedPackageIds.includes(p.id) ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-indigo-100")}>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.industry_name}</p>
                                <p className="text-xs font-black text-slate-800">{p.package_name}</p>
                            </div>
                            {selectedPackageIds.includes(p.id) ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16} className="text-slate-200 group-hover:text-indigo-200"/>}
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">🎯 Mã Shop nhận hàng (Code)</label>
                        <input type="text" className="w-full bg-slate-900 text-white rounded-xl p-3 text-lg font-black uppercase outline-none focus:ring-4 focus:ring-indigo-100" placeholder="VD: 70WPN 88ABC" value={targetCodes} onChange={e => setTargetCodes(e.target.value)} />
                    </div>
                    <button onClick={handlePushMultiKnowledge} disabled={pushingKnowledge} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl text-sm uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                        <Send size={18}/> {pushingKnowledge ? 'ĐANG ĐẨY...' : 'XUẤT XƯỞNG TOÀN BỘ'}
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: API KEYS */}
        {activeTab === 'apikeys' && (
          <div className="max-w-2xl bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex items-center gap-3 mb-6">
                <Key size={18} className="text-amber-500"/>
                <h2 className="text-sm font-black text-slate-900 uppercase">System API Secrets</h2>
             </div>
             <div className="space-y-6">
                {['gemini_api_key_1', 'gemini_api_key_2', 'gemini_api_key_pro'].map((k) => (
                    <div key={k} className="space-y-1">
                        <div className="flex justify-between items-center pr-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</label>
                            <button onClick={() => setShowKeys({...showKeys, [k]: !showKeys[k]})} className="text-indigo-600 text-[9px] font-bold uppercase">{showKeys[k] ? 'Hide' : 'Show'}</button>
                        </div>
                        <input type={showKeys[k] ? "text" : "password"} value={k === 'gemini_api_key_1' ? apiKey1 : k === 'gemini_api_key_2' ? apiKey2 : apiKeyPro} onChange={e => k === 'gemini_api_key_1' ? setApiKey1(e.target.value) : k === 'gemini_api_key_2' ? setApiKey2(e.target.value) : setApiKeyPro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs focus:ring-2 focus:ring-indigo-100 outline-none" />
                    </div>
                ))}
                <button onClick={() => alert('Save Keys Logic...')} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest">Update Cloud Keys</button>
             </div>
          </div>
        )}

        {/* TAB: LOGS */}
        {activeTab === 'errors' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> Recent Error Logs</h2>
                <button onClick={fetchErrorLogs} className="text-[10px] font-black text-indigo-600">Refresh</button>
             </div>
             <div className="space-y-2">
                {errorLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div className="text-[11px] font-bold text-slate-700 max-w-[80%] whitespace-nowrap overflow-hidden text-ellipsis">{log.error_message}</div>
                        <div className="text-[9px] font-black text-slate-300 uppercase">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</div>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB: CONFIG */}
        {activeTab === 'config' && (
          <div className="max-w-xl bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-in fade-in duration-300">
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Global System Settings</h2>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500">Shop Mẫu (Trial Auto-Config)</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-slate-900 uppercase" placeholder="VD: 70WPN" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value)} />
                   <p className="text-[9px] text-slate-400 italic">Khách mới tạo bot sẽ tự động lấy dữ liệu từ shop này.</p>
                </div>
                <button className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-xs shadow-lg">Lưu cấu hình</button>
             </div>
          </div>
        )}

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// Giả lập React để tránh lỗi import
const React = { Fragment: ({ children }: any) => <>{children}</> };
