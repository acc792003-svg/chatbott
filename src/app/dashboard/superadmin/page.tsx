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
  Layers,
  Eye,
  EyeOff,
  User,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Shop = {
  id: string;
  name: string;
  code: string;
  plan: 'free' | 'pro';
  plan_expiry_date: string | null;
  created_at: string;
  user_id?: string; // Cần dùng để đổi mật khẩu
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
  const [showKey1, setShowKey1] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [showKeyPro, setShowKeyPro] = useState(false);

  // Shop Management States
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const [selectedShopAction, setSelectedShopAction] = useState<Shop | null>(null);

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

  const handleUpdateExpiry = async (shopId: string, newDate: string) => {
    try {
      await supabase.from('shops').update({ plan_expiry_date: newDate || null }).eq('id', shopId);
      fetchShops();
    } catch (e) {}
  };

  const handleUpdateIcon = async (shopId: string, iconUrl: string) => {
    try {
      // Cập nhật cấu hình chatbot (icon_url)
      await supabase.from('chatbot_configs').update({ head_icon: iconUrl }).eq('shop_id', shopId);
      alert('Đã cập nhật Icon thành công!');
    } catch (e) {}
  };

  const handleResetPassword = async (shopId: string) => {
    const newPass = prompt('Nhập mật khẩu mới cho Shop này:');
    if (!newPass) return;
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, newPassword: newPass, requesterId: currentUserId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Đã đổi mật khẩu thành công!');
    } catch (e: any) { alert(e.message); }
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

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa shop "${name}"?`)) return;
    try {
      await supabase.from('shops').delete().eq('id', id);
      fetchShops();
    } catch (e: any) { alert(e.message); }
  };

  // ==================== KNOWLEDGE & SETTINGS ====================
  const handleSaveApiKeys = async () => {
    try {
      const updates = [
        { key: 'gemini_api_key_1', value: apiKey1 },
        { key: 'gemini_api_key_2', value: apiKey2 },
        { key: 'gemini_api_key_pro', value: apiKeyPro },
        { key: 'fb_verify_token', value: fbVerifyToken }
      ];
      for (const item of updates) {
        await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: item.key, value: item.value, requesterId: currentUserId }) });
      }
      alert('Đã lưu thành công!');
    } catch (e: any) { alert(e.message); }
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
      const res = await fetch('/api/admin/knowledge/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: rawContent, voice: selectedVoice, requesterId: currentUserId }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProcessedResult(data.result);
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const handlePushKnowledge = async () => {
    const codeList = targetCodes.trim().split(/\s+/).filter(c => c.length > 0);
    if (!processedResult || codeList.length === 0) return alert('Thiếu thông tin!');
    setPushingKnowledge(true);
    try {
      const res = await fetch('/api/admin/knowledge/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes: codeList, data: processedResult, voice: selectedVoice, requesterId: currentUserId }) });
      alert('🚀 Xuất xưởng thành công!');
      setProcessedResult(null); setRawContent(''); setTargetCodes(''); setSelectedTemplate(null);
    } catch (e: any) { alert(e.message); } finally { setPushingKnowledge(false); }
  };

  const handleSaveAsTemplate = async () => {
    if (!processedResult) return;
    const name = prompt('Tên ngành mẫu:', selectedTemplate?.industry_name || '');
    if (!name) return;
    setSavingTemplate(true);
    try {
        await supabase.from('knowledge_templates').upsert({ id: selectedTemplate?.id, industry_name: name, product_info: processedResult.product_info, faq: processedResult.faq, insights: processedResult.insights, example_content: rawContent });
        alert('Đã lưu mẫu!');
        fetchTemplates();
    } catch (e: any) { alert(e.message); } finally { setSavingTemplate(false); }
  };

  // List Filters
  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8 font-black text-slate-300 animate-pulse text-4xl">SECURE ACCESS...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 md:p-8 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] shadow-2xl flex items-center justify-center text-white rotate-3 hover:rotate-0 transition-transform">
                <Settings size={40} className="animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">SUPER-CORE</h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Universal Control Panel</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Live Nodes</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{shops.length}</p>
                </div>
                <Users size={32} className="text-indigo-200" />
            </div>
            <div className="bg-indigo-600 p-1 pr-5 rounded-full flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-black">SA</div>
                <span className="text-sm font-black uppercase tracking-widest text-[10px]">Active</span>
            </div>
          </div>
        </div>

        {/* MÀN HÌNH CHÍNH (TABS) */}
        <div className="flex flex-wrap gap-2 mb-10 bg-white/50 p-2 rounded-3xl w-fit backdrop-blur-sm border border-white">
          {[
            { id: 'shops', label: 'Cửa hàng', icon: <Users size={16}/> },
            { id: 'knowledge', label: 'Xưởng Tri Thức', icon: <BrainCircuit size={16}/> },
            { id: 'apikeys', label: 'Hệ thống Keys', icon: <Key size={16}/> },
            { id: 'errors', label: 'Báo cáo lỗi', icon: <AlertTriangle size={16}/> },
            { id: 'config', label: 'Cấu hình', icon: <Settings size={16}/> },
          ].map((tab) => (
            <button 
              key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn("px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === tab.id ? "bg-indigo-600 text-white shadow-xl scale-105" : "text-slate-500 hover:bg-white")}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== TAB: SHOPS ==================== */}
        {activeTab === 'shops' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6">
            
            {/* Search & Add */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input type="text" placeholder="Tìm kiếm theo Tên hoặc Mã Code..." className="w-full bg-white rounded-[2rem] py-6 pl-16 pr-6 text-lg font-black text-slate-900 border-none shadow-xl focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="bg-indigo-900 rounded-[2rem] p-3 flex gap-2">
                    <input type="text" placeholder="Tên shop mới..." className="flex-1 bg-transparent border-none text-white text-sm font-bold pl-4 focus:ring-0 placeholder:text-indigo-400" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                    <button onClick={handleCreateShop} disabled={addingShop || !newShopName.trim()} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl text-xs font-black hover:bg-indigo-50 transition-all">+ TẠO</button>
                </div>
            </div>

            {/* Shop List */}
            <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-12">Nhận diện Shop</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Plan</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạn sử dụng</th>
                            <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-12">Bảng điều khiển</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredShops.map((shop) => (
                            <tr key={shop.id} className="hover:bg-slate-50 transition-all group">
                                <td className="p-8 pl-12">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg group-hover:bg-indigo-600 transition-all">{shop.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-xl font-black text-slate-900 leading-tight">{shop.name}</p>
                                            <p className="text-[11px] font-black text-indigo-500 uppercase flex items-center gap-1 mt-1 tracking-widest"><Key size={10}/> {shop.code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-8 text-center">
                                    <button onClick={() => togglePlan(shop.id, shop.plan)} className={cn("px-6 py-2 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm border-2", shop.plan === 'pro' ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-slate-100 text-slate-300 hover:border-amber-300 hover:text-amber-900")}>
                                        {shop.plan}
                                    </button>
                                </td>
                                <td className="p-8">
                                    <input 
                                        type="date" 
                                        className="bg-slate-50 border-none rounded-xl p-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-200"
                                        value={shop.plan_expiry_date ? shop.plan_expiry_date.split('T')[0] : ''}
                                        onChange={(e) => handleUpdateExpiry(shop.id, e.target.value)}
                                    />
                                </td>
                                <td className="p-8 pr-12">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleLoginAsShop(shop.code)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all" title="Truy cập Dashboard"><LogIn size={20}/></button>
                                        <button onClick={() => setSelectedShopAction(selectedShopAction?.id === shop.id ? null : shop)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all"><Settings size={20}/></button>
                                        <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="p-4 bg-red-50 text-red-100 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {/* HIỆN BẢNG CẤU HÌNH CHI TIẾT KHI CHỌN SHOP */}
                        {selectedShopAction && (
                            <tr>
                                <td colSpan={4} className="p-0">
                                    <div className="m-8 mt-0 p-10 bg-slate-900 rounded-[3rem] text-white animate-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-start mb-10">
                                            <div>
                                                <h3 className="text-3xl font-black mb-1">Cấu hình: {selectedShopAction.name}</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs">Phân vùng chuyên sâu</p>
                                            </div>
                                            <button onClick={() => setSelectedShopAction(null)} className="text-slate-500 hover:text-white">✕</button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                            {/* Đổi Icon */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><ImageIcon size={14}/> ICON CHATBOT (ẢNH ĐẠI DIỆN)</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => handleUpdateIcon(selectedShopAction.id, '/icons/bot-male.png')} className="bg-white/5 border border-white/10 p-4 rounded-3xl hover:bg-indigo-600 transition-all flex flex-col items-center gap-2">
                                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-3xl">👨</div>
                                                        <span className="text-[10px] font-black">CHATBOT NAM</span>
                                                    </button>
                                                    <button onClick={() => handleUpdateIcon(selectedShopAction.id, '/icons/bot-female.png')} className="bg-white/5 border border-white/10 p-4 rounded-3xl hover:bg-pink-600 transition-all flex flex-col items-center gap-2">
                                                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-3xl">👩</div>
                                                        <span className="text-[10px] font-black">CHATBOT NỮ</span>
                                                    </button>
                                                </div>
                                                <button onClick={() => {
                                                  const url = prompt('Dán link ảnh Icon tùy chỉnh vào đây:');
                                                  if(url) handleUpdateIcon(selectedShopAction.id, url);
                                                }} className="w-full bg-white/10 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white/20 transition-all">SỬ DỤNG LINK ẢNH KHÁC</button>
                                            </div>

                                            {/* An Ninh */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Lock size={14}/> QUẢN TRỊ VIÊN & MẬT KHẨU</label>
                                                <button onClick={() => handleResetPassword(selectedShopAction.id)} className="w-full bg-amber-500 text-slate-900 font-black py-6 rounded-3xl hover:bg-amber-400 transition-all flex items-center justify-center gap-3">
                                                    <Key size={20}/> ĐỔI MẬT KHẨU SHOP
                                                </button>
                                                <p className="text-[10px] text-slate-500 italic text-center">Mật khẩu mới sẽ có hiệu lực ngay lập tức.</p>
                                            </div>

                                            {/* Gói Cước */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Calendar size={14}/> THỜI GIAN SỬ DỤNG</label>
                                                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Trạng thái hiện tại</p>
                                                    <p className="text-2xl font-black mb-4">{selectedShopAction.plan.toUpperCase()}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUpdateExpiry(selectedShopAction.id, new Date(Date.now() + 30*24*60*60*1000).toISOString())} className="flex-1 bg-white text-slate-900 py-2 rounded-xl text-[10px] font-black">+30 NGÀY</button>
                                                        <button onClick={() => handleUpdateExpiry(selectedShopAction.id, new Date(Date.now() + 365*24*60*60*1000).toISOString())} className="flex-1 bg-white text-slate-900 py-2 rounded-xl text-[10px] font-black">+1 NĂM</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* ==================== TAB: KNOWLEDGE WORKSHOP ==================== */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-5 bg-emerald-100 text-emerald-600 rounded-[2rem]"><BrainCircuit size={40}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Xưởng Tri Thức AI</h2>
                        <p className="text-sm font-bold text-slate-400">Chọn ngành hàng {"->"} Luyện AI {"->"} Xuất xưởng.</p>
                    </div>
                </div>

                <div className="mb-10">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em] pl-1">Danh mục Xưởng:</label>
                    <div className="flex flex-wrap gap-2">
                        {knowledgeTemplates.map(t => (
                            <button 
                                key={t.id} onClick={() => { setSelectedTemplate(t); setRawContent(t.example_content || ''); if(t.product_info) setProcessedResult({ product_info: t.product_info, faq: t.faq || '', insights: t.insights || '' }); }}
                                className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2", selectedTemplate?.id === t.id ? "bg-emerald-600 text-white border-emerald-600 shadow-xl scale-110" : "bg-slate-50 text-slate-500 border-slate-100 hover:border-emerald-200")}
                            >
                                {t.industry_name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                     <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl">
                        <label className="block text-[10px] font-black uppercase text-emerald-400 mb-3 tracking-widest">🚀 Mã Shop cần nạp (Shop Code)</label>
                        <input type="text" className="w-full bg-white/10 border-none rounded-2xl p-4 text-xl font-black text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase" placeholder="70WPN 88ABC..." value={targetCodes} onChange={(e) => setTargetCodes(e.target.value)} />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">📦 Nguyên liệu thô</label>
                        <textarea rows={10} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-sm font-medium focus:border-emerald-500 outline-none transition-all shadow-inner" placeholder="Dán văn bản bất kỳ để huấn luyện AI..." value={rawContent} onChange={(e) => setRawContent(e.target.value)}></textarea>
                    </div>

                    <button onClick={handleProcessKnowledge} disabled={isProcessing || !rawContent.trim()} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 text-lg">
                        {isProcessing ? 'AI ĐANG XỬ LÝ...' : '🔥 LUYỆN TRI THỨC'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100 min-h-[700px] flex flex-col relative">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><CheckCircle size={30}/></div>
                        <h2 className="text-2xl font-black text-slate-900">Thành Phẩm</h2>
                    </div>
                </div>

                {processedResult ? (
                    <div className="space-y-10 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1">1. Mô tả sản phẩm Chế tác bởi AI</label>
                            <textarea value={processedResult.product_info} onChange={e => setProcessedResult({...processedResult, product_info: e.target.value})} className="w-full bg-slate-50/50 rounded-3xl p-6 text-sm font-bold leading-relaxed outline-none border-none shadow-inner" rows={8}></textarea>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-1">2. Bộ câu hỏi FAQ chuẩn gu</label>
                            <textarea value={processedResult.faq} onChange={e => setProcessedResult({...processedResult, faq: e.target.value})} className="w-full bg-slate-50/50 rounded-3xl p-6 text-sm font-bold leading-relaxed outline-none border-none shadow-inner" rows={10}></textarea>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">3. Insight & Chiến thuật níu khách</label>
                            <textarea value={processedResult.insights} onChange={e => setProcessedResult({...processedResult, insights: e.target.value})} className="w-full bg-amber-50/20 rounded-3xl p-6 text-sm font-bold italic text-slate-600 outline-none border-none shadow-inner" rows={4}></textarea>
                        </div>

                        {/* NÚT XUẤT XƯỞNG TO VÀ NỔI BẬT NHẤT Ở CUỐI KẾT QUẢ */}
                        <div className="flex gap-4 pt-10 sticky bottom-0 bg-white pb-6 mt-10 shadow-[0_-20px_20px_-10px_rgba(255,255,255,1)]">
                             <button onClick={handlePushKnowledge} disabled={pushingKnowledge} className="flex-1 bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-xl ring-8 ring-indigo-50">
                                🚀 {pushingKnowledge ? 'ĐANG ĐẨY...' : 'XUẤT XƯỞNG NGAY'}
                             </button>
                             <button onClick={handleSaveAsTemplate} disabled={savingTemplate} className="bg-slate-900 text-white px-8 py-6 rounded-3xl font-black text-xs hover:bg-black transition-all flex flex-col items-center justify-center">
                                <Database size={18} className="mb-1" />
                                <span>LƯU MẪU</span>
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                        <Bot size={120} />
                        <p className="font-black text-3xl uppercase tracking-tighter mt-4">Chưa có "Phôi"</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* TAB: API KEYS */}
        {activeTab === 'apikeys' && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-100">
                <div className="flex items-center gap-4 mb-12">
                    <div className="p-5 bg-amber-100 text-amber-600 rounded-[2rem]"><Key size={40}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Hệ thống Keys</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Authentication Center</p>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gemini API Key 01 (Free)</label>
                            <button onClick={() => setShowKey1(!showKey1)} className="text-indigo-600 font-bold text-[10px] uppercase flex items-center gap-1">
                                {showKey1 ? <><EyeOff size={12}/> Ẩn khóa</> : <><Eye size={12}/> Hiện khóa</>}
                            </button>
                        </div>
                        <input type={showKey1 ? "text" : "password"} value={apiKey1} onChange={e => setApiKey1(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-mono text-sm focus:border-amber-500 outline-none transition-all shadow-inner" placeholder="Key 1..."/>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gemini API Key 02 (Dự phòng)</label>
                            <button onClick={() => setShowKey2(!showKey2)} className="text-indigo-600 font-bold text-[10px] uppercase flex items-center gap-1">
                                {showKey2 ? <><EyeOff size={12}/> Ẩn khóa</> : <><Eye size={12}/> Hiện khóa</>}
                            </button>
                        </div>
                        <input type={showKey2 ? "text" : "password"} value={apiKey2} onChange={e => setApiKey2(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-mono text-sm focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="Key 2..."/>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">🌟 Gemini PRO Dedicated Key</label>
                            <button onClick={() => setShowKeyPro(!showKeyPro)} className="text-amber-600 font-bold text-[10px] uppercase flex items-center gap-1">
                                {showKeyPro ? <><EyeOff size={12}/> Ẩn khóa</> : <><Eye size={12}/> Hiện khóa</>}
                            </button>
                        </div>
                        <input type={showKeyPro ? "text" : "password"} value={apiKeyPro} onChange={e => setApiKeyPro(e.target.value)} className="w-full bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 font-mono text-sm focus:border-amber-600 outline-none transition-all shadow-inner text-amber-900" placeholder="API Key Pro..."/>
                    </div>

                    <button onClick={handleSaveApiKeys} className="w-full bg-slate-900 text-white font-black py-8 rounded-[3rem] shadow-2xl hover:bg-black transition-all uppercase tracking-[0.3em] text-sm mt-6">
                        🔒 KHÓA CẤU HÌNH HỆ THỐNG
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* TAB: ERROR LOGS */}
        {activeTab === 'errors' && (
          <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-red-50 text-red-600 rounded-[2rem]"><AlertTriangle size={40}/></div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 leading-none">Nhật ký Lỗi</h2>
                        <p className="text-sm font-bold text-slate-400 mt-2">Hệ thống giám sát trạm Chatbot.</p>
                    </div>
                </div>
                <button onClick={fetchErrorLogs} className="bg-slate-50 text-slate-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all border border-slate-200">Làm mới dữ liệu</button>
            </div>

            <div className="space-y-6">
                {errorLogs.map(log => (
                    <div key={log.id} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white hover:shadow-2xl transition-all">
                        <div className="space-y-3">
                           <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-white bg-red-600 px-3 py-1 rounded-full uppercase tracking-widest">{log.error_type}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SOURCE: {log.source}</span>
                           </div>
                           <p className="text-lg font-bold text-slate-900 leading-tight">{log.error_message}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <p className="text-[10px] font-black text-slate-300 uppercase">{new Date(log.created_at).toLocaleDateString('vi-VN')}</p>
                            <p className="text-xs font-black text-slate-900 tracking-tighter">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</p>
                        </div>
                    </div>
                ))}
                {errorLogs.length === 0 && <div className="text-center py-20 text-slate-300 font-black text-3xl opacity-20 uppercase tracking-tighter italic">No Issues Recorded</div>}
            </div>
          </div>
        )}

        {/* TAB: CONFIGURATIONS */}
        {activeTab === 'config' && (
          <div className="max-w-2xl bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
            <div className="flex items-center gap-6 mb-12">
                <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem]"><Settings size={40}/></div>
                <div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Cấu hình</h2>
                   <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Global Engine Controls</p>
                </div>
            </div>

            <div className="space-y-10">
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mã Shop Mẫu (Mặc định cho khách mới/Trial)</label>
                  <input type="text" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 font-black text-2xl focus:border-indigo-500 outline-none shadow-inner" placeholder="VD: 70WPN"/>
                  <p className="text-[11px] text-slate-500 font-medium italic pl-1 leading-relaxed">Dùng mã của shop có tri thức hoàn chỉnh nhất để làm khuôn mẫu tự động cho khách đăng ký dùng thử.</p>
               </div>

               <button onClick={handleSaveConfig} disabled={savingConfig} className="w-full bg-slate-900 text-white font-black py-8 rounded-[3rem] shadow-2xl hover:bg-black transition-all uppercase tracking-[0.4em] text-xs">
                  {savingConfig ? 'EXECUTING...' : 'CẬP NHẬT TRẠM CẤU HÌNH'}
               </button>
            </div>
          </div>
        )}

      </div>
      
      {/* GLOBAL STYLES */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
