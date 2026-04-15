'use client';

import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { 
  Users, 
  Key, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle, 
  Settings, 
  Database,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  BrainCircuit,
  Bot,
  LogIn,
  Edit2,
  Calendar,
  Layers
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

type ErrorLog = {
  id: string;
  error_type: string;
  error_message: string;
  source: string;
  created_at: string;
  shop_id: string | null;
};

type KnowledgeTemplate = {
    id: string;
    industry_name: string;
    product_info: string;
    faq: string;
    insights: string;
    example_content: string;
};

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [apiKey1, setApiKey1] = useState('');
  const [apiKey2, setApiKey2] = useState('');
  const [apiKeyPro, setApiKeyPro] = useState('');
  const [fbVerifyToken, setFbVerifyToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'apikeys' | 'errors' | 'config' | 'knowledge'>('shops');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Shop Management States
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  // Knowledge Workshop States
  const [rawContent, setRawContent] = useState('');
  const [targetCodes, setTargetCodes] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('nhẹ nhàng');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<{
    product_info: string;
    faq: string;
    insights: string;
  } | null>(null);
  const [pushingKnowledge, setPushingKnowledge] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [knowledgeTemplates, setKnowledgeTemplates] = useState<KnowledgeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<KnowledgeTemplate | null>(null);

  // System Config States
  const [trialTemplateCode, setTrialTemplateCode] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setCurrentUserId(user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role === 'super_admin') {
      setIsSuperAdmin(true);
      fetchShops();
      fetchApiKeys();
      fetchErrorLogs();
      fetchTrialConfig();
      fetchTemplates();
    } else {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    const { data } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setShops(data);
    setLoading(false);
  };

  const fetchErrorLogs = async () => {
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setErrorLogs(data);
  };

  const fetchApiKeys = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const k1 = data.find((d: any) => d.key === 'gemini_api_key_1')?.value || '';
      const k2 = data.find((d: any) => d.key === 'gemini_api_key_2')?.value || '';
      const kp = data.find((d: any) => d.key === 'gemini_api_key_pro')?.value || '';
      const fb = data.find((d: any) => d.key === 'fb_verify_token')?.value || '';
      setApiKey1(k1);
      setApiKey2(k2);
      setApiKeyPro(kp);
      setFbVerifyToken(fb);
    }
  };

  const fetchTrialConfig = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
    if (data) setTrialTemplateCode(data.value);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('knowledge_templates').select('*').order('industry_name', { ascending: true });
    if (data) setKnowledgeTemplates(data);
  };

  // ==================== SHOP ACTIONS ====================
  const generateShopCode = () => {
    const nums = '0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += nums[Math.floor(Math.random() * nums.length)];
    return 'SHOP-' + code;
  };

  const handleCreateShop = async () => {
    if (!newShopName.trim()) return;
    setAddingShop(true);
    const shopCode = generateShopCode();
    try {
      const { data, error } = await supabase.from('shops').insert({ name: newShopName, code: shopCode, plan: 'free' }).select().single();
      if (error) throw error;
      setNewShopName('');
      fetchShops();
      alert(`Đã tạo shop thành công! Mã shop: ${shopCode}`);
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setAddingShop(false);
    }
  };

  const handleUpdateShopName = async () => {
    if (!editingShop || !newShopName.trim()) return;
    try {
      await supabase.from('shops').update({ name: newShopName }).eq('id', editingShop.id);
      setEditingShop(null);
      setNewShopName('');
      fetchShops();
    } catch (e) {}
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa shop "${name}"? Thao tác này sẽ xóa toàn bộ tin nhắn và cấu hình.`)) return;
    try {
      const { error } = await supabase.from('shops').delete().eq('id', id);
      if (error) throw error;
      fetchShops();
    } catch (e: any) { alert('Lỗi khi xóa: ' + e.message); }
  };

  const togglePlan = async (id: string, currentPlan: string) => {
    const newPlan = currentPlan === 'free' ? 'pro' : 'free';
    const expiry = newPlan === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    try {
      await supabase.from('shops').update({ plan: newPlan, plan_expiry_date: expiry }).eq('id', id);
      fetchShops();
    } catch (e) {}
  };

  const handleLoginAsShop = async (code: string) => {
    window.open(`/dashboard?code=${code}`, '_blank');
  };

  // ==================== SETTINGS & KNOWLEDGE ====================
  const handleSaveApiKeys = async () => {
    try {
      const updates = [
        { key: 'gemini_api_key_1', value: apiKey1 },
        { key: 'gemini_api_key_2', value: apiKey2 },
        { key: 'gemini_api_key_pro', value: apiKeyPro },
        { key: 'fb_verify_token', value: fbVerifyToken }
      ];
      for (const item of updates) {
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: item.key, value: item.value, requesterId: currentUserId })
        });
      }
      alert('Đã lưu các cài đặt thành công!');
    } catch (e: any) { alert('Lỗi: ' + e.message); }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'trial_template_shop_code', value: trialTemplateCode, requesterId: currentUserId })
      });
      alert('Đã lưu cấu hình Trial thành công!');
    } catch (e: any) { alert('Lỗi: ' + e.message); } finally { setSavingConfig(false); }
  };

  const handleProcessKnowledge = async () => {
    if (!rawContent.trim()) return alert('Vui lòng nhập nội dung thô!');
    setIsProcessing(true);
    setProcessedResult(null);
    try {
      const res = await fetch('/api/admin/knowledge/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawContent, voice: selectedVoice, requesterId: currentUserId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProcessedResult(data.result);
    } catch (e: any) { alert('Lỗi xứ lý AI: ' + e.message); } finally { setIsProcessing(false); }
  };

  const handlePushKnowledge = async () => {
    const codeList = targetCodes.trim().split(/\s+/).filter(c => c.length > 0);
    if (!processedResult || codeList.length === 0) return alert('Thiếu thông tin kết quả hoặc mã shop!');
    setPushingKnowledge(true);
    try {
      const res = await fetch('/api/admin/knowledge/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: codeList, data: processedResult, voice: selectedVoice, requesterId: currentUserId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`🚀 Thành công! Đã cập nhật tri thức cho ${data.count} shops.`);
      setProcessedResult(null); setRawContent(''); setTargetCodes(''); setSelectedTemplate(null);
    } catch (e: any) { alert('Lỗi xuất xưởng: ' + e.message); } finally { setPushingKnowledge(false); }
  };

  const handleSaveAsTemplate = async () => {
    if (!processedResult) return;
    const name = prompt('Nhập tên ngành hàng để lưu mẫu:', selectedTemplate?.industry_name || '');
    if (!name) return;
    setSavingTemplate(true);
    try {
        const { error } = await supabase.from('knowledge_templates').upsert({
            id: selectedTemplate?.id,
            industry_name: name,
            product_info: processedResult.product_info,
            faq: processedResult.faq,
            insights: processedResult.insights,
            example_content: rawContent
        });
        if (error) throw error;
        alert('Đã lưu mẫu ngành thành công!');
        fetchTemplates();
    } catch (e: any) { alert('Lỗi khi lưu mẫu: ' + e.message); } finally { setSavingTemplate(false); }
  };

  // Filtered Shops
  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const proShops = shops.filter(s => s.plan === 'pro').length;

  if (loading) return <div className="p-8 font-bold text-slate-500 animate-pulse">ĐANG TẢI DỮ LIỆU SUPER ADMIN...</div>;
  if (!isSuperAdmin) return <div className="p-8 text-red-600 font-bold bg-red-50 h-screen flex items-center justify-center">BẠN KHÔNG CÓ QUYỀN TRUY CẬP TRANG NÀY!</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto">
        
        {/* UPPER HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">System Root</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-400">v4.2.0 Stable</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
              <Layers className="text-indigo-600" size={48} />
              SUPER CONTROLLER
            </h1>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col items-end">
                <p className="text-sm font-black text-slate-900">Administrator</p>
                <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    HỆ THỐNG TRỰC TUYẾN
                </p>
            </div>
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl">SA</div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all cursor-default">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Users size={24}/></div>
                <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1"><TrendingUp size={12}/> +12%</div>
            </div>
            <div className="mt-4">
                <p className="text-3xl font-black text-slate-900">{shops.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng số Cửa hàng</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-all cursor-default">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors"><Key size={24}/></div>
                <div className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Pro Plan Only</div>
            </div>
            <div className="mt-4">
                <p className="text-3xl font-black text-slate-900">{proShops}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thuê bao Cao cấp</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all cursor-default">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><BrainCircuit size={24}/></div>
                <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Knowledge</div>
            </div>
            <div className="mt-4">
                <p className="text-3xl font-black text-slate-900">{knowledgeTemplates.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mẫu Xưởng Tri Thức</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-red-200 transition-all cursor-default">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-colors"><AlertTriangle size={24}/></div>
                <div className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Critical Logs</div>
            </div>
            <div className="mt-4">
                <p className="text-3xl font-black text-slate-900">{errorLogs.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sự cố ghi nhận</p>
            </div>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          {[
            { id: 'shops', label: 'Cửa hàng', icon: <Users size={16}/> },
            { id: 'knowledge', label: 'Xưởng Tri Thức', icon: <BrainCircuit size={16}/> },
            { id: 'apikeys', label: 'Hệ thống Keys', icon: <Key size={16}/> },
            { id: 'errors', label: 'Báo cáo lỗi', icon: <AlertTriangle size={16}/> },
            { id: 'config', label: 'Cấu hình chung', icon: <Settings size={16}/> },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === tab.id 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* =================================================================================== */}
        {/* CONTENT TABS */}
        {/* =================================================================================== */}
        
        {/* TAB: SHOPS - THE HEART OF ADMIN */}
        {activeTab === 'shops' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm tên shop hoặc mã code..." 
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Tên shop mới..." 
                        className="flex-1 md:w-64 bg-white border-2 border-slate-100 rounded-xl px-4 text-sm font-bold focus:border-indigo-500 outline-none"
                        value={newShopName}
                        onChange={e => setNewShopName(e.target.value)}
                    />
                    <button 
                        onClick={handleCreateShop}
                        disabled={addingShop || !newShopName.trim()}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all uppercase whitespace-nowrap disabled:opacity-50"
                    >
                        + Tạo Shop
                    </button>
                </div>
            </div>

            {/* Shop Table */}
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">#</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0">Bản sắc Shop</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gói dịch vụ</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hết hạn</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Điều khiển</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredShops.map((shop, idx) => (
                            <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-8 text-center text-xs font-black text-slate-300">{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="p-8 pl-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {shop.name.charAt(0)}
                                        </div>
                                        <div>
                                            {editingShop?.id === shop.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text" 
                                                        autoFocus
                                                        className="bg-slate-50 border-b-2 border-indigo-500 outline-none font-black text-slate-900 px-1"
                                                        value={newShopName}
                                                        onChange={e => setNewShopName(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleUpdateShopName()}
                                                    />
                                                    <button onClick={handleUpdateShopName} className="text-emerald-500 p-1"><CheckCircle size={14}/></button>
                                                </div>
                                            ) : (
                                                <p className="font-black text-slate-900 text-base flex items-center gap-2">
                                                    {shop.name}
                                                    <button onClick={() => { setEditingShop(shop); setNewShopName(shop.name); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-indigo-600"><Edit2 size={12}/></button>
                                                </p>
                                            )}
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                                <Key size={10} className="text-indigo-400"/> {shop.code}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-8 text-center text-xs">
                                    <button 
                                        onClick={() => togglePlan(shop.id, shop.plan)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black uppercase text-[9px] transition-all border-2",
                                            shop.plan === 'pro' 
                                                ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm" 
                                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-700"
                                        )}
                                    >
                                        {shop.plan === 'pro' && <Bot size={10}/>}
                                        {shop.plan}
                                    </button>
                                </td>
                                <td className="p-8">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800">
                                            {shop.plan_expiry_date ? new Date(shop.plan_expiry_date).toLocaleDateString('vi-VN') : '∞ Vĩnh viễn'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase">Hạn dùng</span>
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="flex items-center justify-end gap-3">
                                        <button 
                                            onClick={() => handleLoginAsShop(shop.code)}
                                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            title="Đăng nhập Dashboard Shop"
                                        >
                                            <LogIn size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteShop(shop.id, shop.name)}
                                            className="p-2.5 bg-red-50 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            title="Xóa Shop"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: KNOWLEDGE WORKSHOP - THE FACTORY */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="space-y-6">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-[1.5rem]"><BrainCircuit size={32}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Xưởng Tri Thức AI</h2>
                        <p className="text-sm font-bold text-slate-400">Luyện "cơ bắp" cho Chatbot theo từng ngành.</p>
                    </div>
                </div>

                {/* Preset List */}
                <div className="mb-10">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest pl-1">Nguyên liệu mẫu sẵn có:</label>
                    <div className="flex flex-wrap gap-2">
                        {knowledgeTemplates.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => {
                                    setSelectedTemplate(t);
                                    setRawContent(t.example_content || '');
                                    if (t.product_info) setProcessedResult({ product_info: t.product_info, faq: t.faq || '', insights: t.insights || '' });
                                    else setProcessedResult(null);
                                }}
                                className={cn(
                                    "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2",
                                    selectedTemplate?.id === t.id 
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105" 
                                        : "bg-slate-50 text-slate-500 border-slate-100 hover:border-emerald-200"
                                )}
                            >
                                {t.industry_name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">📦 Cấp cho Shop Code</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black focus:border-emerald-500 outline-none uppercase shadow-inner"
                            placeholder="VD: 70WPN 88ABC..."
                            value={targetCodes}
                            onChange={(e) => setTargetCodes(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">📄 Văn bản nguyên liệu</label>
                        <textarea 
                            rows={8}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-medium focus:border-emerald-500 outline-none transition-all shadow-inner"
                            placeholder="Dán nội dung bất kỳ vào đây để AI phân tích..."
                            value={rawContent}
                            onChange={(e) => setRawContent(e.target.value)}
                        ></textarea>
                    </div>

                    <button 
                        onClick={handleProcessKnowledge}
                        disabled={isProcessing || !rawContent.trim()}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isProcessing ? 'ĐANG PHÂN TÍCH...' : '🔥 BẮT ĐẦU LUYỆN TRI THỨC'}
                    </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Layers size={21}/></div>
                        <h2 className="text-xl font-black text-slate-900">Thành phẩm AI</h2>
                    </div>
                    {processedResult && (
                        <div className="flex gap-2">
                            <button onClick={handlePushKnowledge} disabled={pushingKnowledge} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700">🚀 Xuất xưởng</button>
                            <button onClick={handleSaveAsTemplate} disabled={savingTemplate} className="bg-white border-2 border-slate-100 text-slate-500 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:border-emerald-500 hover:text-emerald-600">💾 Lưu kho</button>
                        </div>
                    )}
                </div>

                {processedResult ? (
                    <div className="space-y-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Mô tả sản phẩm</label>
                            <textarea value={processedResult.product_info} onChange={e => setProcessedResult({...processedResult, product_info: e.target.value})} className="w-full bg-slate-50/50 rounded-2xl p-4 text-xs font-bold leading-relaxed outline-none border-none" rows={6}></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">Hỏi & Đáp thường gặp</label>
                            <textarea value={processedResult.faq} onChange={e => setProcessedResult({...processedResult, faq: e.target.value})} className="w-full bg-slate-50/50 rounded-2xl p-4 text-xs font-bold leading-relaxed outline-none border-none" rows={8}></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-1">Insights Níu kéo khách</label>
                            <textarea value={processedResult.insights} onChange={e => setProcessedResult({...processedResult, insights: e.target.value})} className="w-full bg-amber-50/30 rounded-2xl p-4 text-xs font-bold italic text-slate-600 outline-none border-none" rows={4}></textarea>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                        <Database size={64} className="mb-4" />
                        <p className="font-black text-xl uppercase tracking-tighter">Đang chờ lệnh...</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: API KEYS & SYSTEM */}
        {activeTab === 'apikeys' && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-4 bg-white/10 rounded-3xl"><Key size={32}/></div>
                    <div>
                        <h2 className="text-2xl font-black">Hệ thống API Keys</h2>
                        <p className="text-sm text-slate-400 font-medium">Quản lý các chìa khóa lõi của AI.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Gemini Model Free (Dual Key)</label>
                        <input type="password" value={apiKey1} onChange={e => setApiKey1(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-sm focus:bg-white/10 outline-none transition-all" placeholder="API Key 01..."/>
                        <input type="password" value={apiKey2} onChange={e => setApiKey2(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-sm focus:bg-white/10 outline-none transition-all" placeholder="API Key 02..."/>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] ml-1 flex items-center gap-2">⭐ Gemini Pro Dedicated Key</label>
                        <input type="password" value={apiKeyPro} onChange={e => setApiKeyPro(e.target.value)} className="w-full bg-amber-400/5 border border-amber-400/20 rounded-2xl p-4 font-mono text-sm focus:bg-amber-400/10 outline-none transition-all text-amber-100" placeholder="API Key Pro Exclusive..."/>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-white/5">
                        <label className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] ml-1">🌐 Webhook Verify Token</label>
                        <input type="text" value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)} className="w-full bg-blue-400/5 border border-blue-400/20 rounded-2xl p-4 font-mono text-sm focus:bg-blue-400/10 outline-none transition-all text-blue-100" placeholder="my_secret_verify_token..."/>
                    </div>

                    <button onClick={handleSaveApiKeys} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-500/20 transition-all uppercase tracking-widest mt-4">
                        🔐 LƯU CẤU HÌNH HỆ THỐNG
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* TAB: ERROR LOGS */}
        {activeTab === 'errors' && (
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-[1.5rem]"><AlertTriangle size={32}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Báo cáo Sự cố</h2>
                        <p className="text-sm font-bold text-slate-400 font-medium">Tất cả lỗi được hệ thống ghi lại.</p>
                    </div>
                </div>
                <button onClick={fetchErrorLogs} className="text-xs font-black text-indigo-600 px-4 py-2 border-2 border-indigo-100 rounded-xl hover:bg-indigo-50">LÀM MỚI LOGS</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {errorLogs.map(log => (
                    <div key={log.id} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-4 group hover:bg-white hover:shadow-md transition-all">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">{log.error_type}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CODE: {log.source}</span>
                           </div>
                           <p className="text-sm font-bold text-slate-900">{log.error_message}</p>
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase shrink-0">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB: CONFIG */}
        {activeTab === 'config' && (
          <div className="max-w-2xl bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-slate-100 text-slate-800 rounded-[1.5rem]"><Settings size={32}/></div>
                <div>
                   <h2 className="text-2xl font-black mb-1">Cấu hình chung</h2>
                   <p className="text-sm text-slate-400 font-medium tracking-tight">Cài đặt hành vi hệ thống toàn cục.</p>
                </div>
            </div>

            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mã Shop dùng thử mặc định (Trial)</label>
                  <input type="text" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-sm focus:border-indigo-500 outline-none" placeholder="VD: 70WPN"/>
                  <p className="text-[10px] text-slate-400 italic">Chatbot mới tạo sẽ tự bốc tri thức của shop này.</p>
               </div>

               <button onClick={handleSaveConfig} disabled={savingConfig} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl shadow-slate-200 hover:bg-black transition-all uppercase tracking-widest">
                  {savingConfig ? 'Đang lưu...' : 'CẬP NHẬT CẤU HÌNH'}
               </button>
            </div>
          </div>
        )}

      </div>
      
      {/* CSS For Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
