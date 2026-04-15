'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Key, AlertTriangle, Plus, Trash2, Search, CheckCircle, Settings, Database,
  ArrowRight, TrendingUp, BrainCircuit, Bot, LogIn, Edit2, Calendar, Layers, Eye, EyeOff,
  User, Lock, Image as ImageIcon, CheckSquare, Square, Package, Send, ExternalLink, Link as LinkIcon, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Shop = {
  id: string;
  name: string;
  code: string;
  plan: 'free' | 'pro';
  plan_expiry_date: string | null;
  created_at: string;
  slug?: string; // Tên đuôi deeplink (qlady)
  users?: { email: string; id: string }[]; // Tài khoản gán với shop
};

type KnowledgePackage = {
    id: string;
    industry_name: string;
    package_name: string; 
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
  const [activeIcons, setActiveIcons] = useState<{ [key: string]: string }>({});

  // Knowledge Workshop
  const [rawContent, setRawContent] = useState('');
  const [targetCodes, setTargetCodes] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<any>(null);
  const [knowledgePackages, setKnowledgePackages] = useState<KnowledgePackage[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [editingPackage, setEditingPackage] = useState<KnowledgePackage | null>(null);
  const [pushingKnowledge, setPushingKnowledge] = useState(false);

  // System Config
  const [trialTemplateCode, setTrialTemplateCode] = useState('');

  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => { 
    checkUser();
    
    // THIẾT LẬP REALTIME CHO NHẬT KÝ LỖI
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        (payload) => {
          // Khi có lỗi mới, tự động tải lại danh sách logs
          fetchErrorLogs();
          // Đồng thời hiện thông báo "Toast" nếu đó là lỗi từ Widget
          if (payload.new.source === 'API_CHAT_WIDGET') {
            addToast(`Cảnh báo: Shop vừa có lỗi Chatbot!`, 'error');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

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
    // Truy vấn shop kèm theo email từ bảng users
    const { data } = await supabase
        .from('shops')
        .select('*, users(email, id)')
        .order('created_at', { ascending: false });

    if (data) {
        setShops(data);
        const { data: configs } = await supabase.from('chatbot_configs').select('shop_id, head_icon');
        const iconMap: any = {};
        configs?.forEach((c: any) => iconMap[c.shop_id] = c.head_icon);
        setActiveIcons(iconMap);
    }
    setLoading(false);
  };

  const fetchKnowledgePackages = async () => {
    const { data } = await supabase.from('knowledge_templates').select('*').order('created_at', { ascending: false });
    if (data) setKnowledgePackages(data);
  };

  const fetchErrorLogs = async () => {
    // Truy vấn log kèm theo tên shop để admin dễ nhận diện
    const { data } = await supabase
        .from('error_logs')
        .select('*, shops(name, code)')
        .order('created_at', { ascending: false })
        .limit(50);
    if (data) setErrorLogs(data);
  };

  const fetchApiKeys = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      setApiKey1(data.find((d: any) => d.key === 'gemini_api_key_1')?.value || '');
      setApiKey2(data.find((d: any) => d.key === 'gemini_api_key_2')?.value || '');
      setApiKeyPro(data.find((d: any) => d.key === 'gemini_api_key_pro')?.value || '');
      setFbVerifyToken(data.find((d: any) => d.key === 'fb_verify_token')?.value || '');
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
    // Tính toán ngày mai (1 ngày dùng thử)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    try {
      await supabase.from('shops').insert({ 
        name: newShopName, 
        code: code, 
        plan: 'free',
        plan_expiry_date: tomorrow.toISOString()
      });
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

  const handleUpdateSlug = async (shopId: string, slug: string) => {
    // Chỉnh sửa tên đuôi (qlady)
    await supabase.from('shops').update({ slug: slug.trim() }).eq('id', shopId);
    fetchShops();
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa shop "${name}"?`)) return;
    try {
      await supabase.from('shops').delete().eq('id', id);
      fetchShops();
    } catch (e: any) { alert(e.message); }
  };

  const handleResetPassword = async (shopId: string) => {
    const pass = prompt('Mật khẩu mới:');
    if (!pass) return;
    const res = await fetch('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ shopId, newPassword: pass, requesterId: currentUserId }) });
    if (res.ok) alert('Đã đổi mật khẩu thành công!');
  };

  const handleUpdateIcon = async (shopId: string, url: string) => {
    await supabase.from('chatbot_configs').update({ head_icon: url }).eq('shop_id', shopId);
    setActiveIcons(prev => ({ ...prev, [shopId]: url }));
    alert('Đã đổi icon!');
  };

  // ==================== KNOWLEDGE WORKSHOP ACTIONS ====================
  const [processStatus, setProcessStatus] = useState('');

  const handleProcessKnowledge = async () => {
    if (!rawContent.trim() || !industryName.trim() || !packageName.trim()) {
        setProcessStatus('❌ Thiếu thông tin nạp liệu!');
        return;
    }
    
    setIsProcessing(true);
    setProcessStatus('🤖 Hệ thống đang gửi dữ liệu tới Gemini AI...');
    
    try {
      const res = await fetch('/api/admin/knowledge/process', { 
        method: 'POST', 
        body: JSON.stringify({ content: rawContent, voice: 'nhẹ nhàng', requesterId: currentUserId }) 
      });
      
      const data = await res.json();
      
      if (data.error) {
        setProcessStatus(`❌ Lỗi AI: ${data.error}`);
        addToast(`Lỗi AI: ${data.error}`, 'error');
        return;
      }
      
      if (data.result) {
        setProcessStatus('📦 AI đã phân tích xong. Đang đóng gói dữ liệu...');
        
        const { error } = await supabase.from('knowledge_templates').insert({
            industry_name: industryName,
            package_name: packageName,
            product_info: data.result.product_info,
            faq: data.result.faq,
            insights: data.result.insights,
            example_content: rawContent
        });
        
        if (error) {
            setProcessStatus(`❌ Lỗi lưu DB: ${error.message}`);
            addToast('Lỗi lưu cơ sở dữ liệu!', 'error');
            return;
        }
        
        setProcessStatus('✅ HOÀN THÀNH!');
        addToast(`Đã luyện thành công gói: ${packageName}`, 'success');
        setRawContent(''); 
        setPackageName('');
        fetchKnowledgePackages(); 
      }
    } catch (e: any) { 
        setProcessStatus(`❌ Lỗi hệ thống: ${e.message}`);
        addToast('Lỗi kết nối hệ thống!', 'error');
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage) return;
    await supabase.from('knowledge_templates').update({
        package_name: editingPackage.package_name,
        product_info: editingPackage.product_info,
        faq: editingPackage.faq,
        insights: editingPackage.insights
    }).eq('id', editingPackage.id);
    alert('Đã cập nhật gói!');
    setEditingPackage(null); fetchKnowledgePackages();
  };

  const handlePushMultiKnowledge = async () => {
    const codeList = targetCodes.trim().split(/\s+/).filter(c => c.length > 0);
    if (selectedPackageIds.length === 0 || codeList.length === 0) return alert('Chưa chọn mã shop!');
    setPushingKnowledge(true);
    try {
        const pkgs = knowledgePackages.filter(p => selectedPackageIds.includes(p.id));
        const combined = {
            product_info: pkgs.map(p => `[${p.package_name}]\n${p.product_info}`).join('\n\n---\n\n'),
            faq: pkgs.map(p => `--- Gói: ${p.package_name} ---\n${p.faq}`).join('\n\n'),
            insights: pkgs.map(p => p.insights).join('\n\n')
        };
        const res = await fetch('/api/admin/knowledge/push', { method: 'POST', body: JSON.stringify({ codes: codeList, data: combined, voice: 'nhẹ nhàng', requesterId: currentUserId }) });
        const data = await res.json();
        addToast(`🚀 Đã xuất xưởng thành công cho ${data.count} shop!`, 'success');
        setSelectedPackageIds([]); setTargetCodes('');
    } catch (e) { 
        addToast('Lỗi xuất xưởng dữ liệu!', 'error');
    } finally { setPushingKnowledge(false); }
  };

  // Filtered Shops
  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400">SYNCING ADMIN CORE...</div>;

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 p-2 md:p-6 font-sans">
      <div className="max-w-[1400px] mx-auto focus-within:outline-none">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Settings size={18}/></div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">SUPER CONTROL</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider text-xs">Enterprise Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Nodes</p>
                <p className="text-sm font-black text-slate-900">{shops.length}</p>
              </div>
              <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs">SA</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6 w-fit mx-2">
          {[
            { id: 'shops', label: 'Cửa hàng', icon: <Users size={14}/> },
            { id: 'knowledge', label: 'Xưởng Tri Thức', icon: <BrainCircuit size={14}/> },
            { id: 'apikeys', label: 'Cấu hình API', icon: <Key size={14}/> },
            { id: 'errors', label: 'Nhật ký lỗi', icon: <AlertTriangle size={14}/> },
            { id: 'config', label: 'Cài đặt chung', icon: <Settings size={14}/> },
          ].map((tab) => (
            <button 
              key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all", activeTab === tab.id ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100" : "text-slate-500 hover:bg-slate-50")}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== TAB: SHOPS ==================== */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 px-2 lg:px-0">
            <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Tìm theo Tên, Mã hoặc Link (QLADY)..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:border-indigo-500 outline-none shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <input type="text" placeholder="Thêm shop mới..." className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-48 shadow-sm" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                    <button onClick={handleCreateShop} disabled={addingShop} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-100">+ TẠO SHOP</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase pl-6">Thông tin Shop & Tài khoản</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-28">Gói Dùng</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-36">Thời hạn dùng</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-32">Trạng thái</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right w-24 pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredShops.map((shop) => {
                            const expiryDate = shop.plan_expiry_date ? new Date(shop.plan_expiry_date) : null;
                            const today = new Date();
                            const diffTime = expiryDate ? expiryDate.getTime() - today.getTime() : 0;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const isExpired = expiryDate && diffDays <= 0;

                            return (
                            <Fragment key={shop.id}>
                                <tr className="hover:bg-slate-50/50 transition-all border-b border-transparent">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">
                                                {shop.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 leading-none mb-1.5">{shop.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-indigo-600 tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded leading-none">#{shop.code}</span>
                                                    {shop.slug && <span className="text-[10px] font-black text-emerald-600 tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded leading-none">/{shop.slug}</span>}
                                                    <button onClick={() => setOpenShopId(openShopId === shop.id ? null : shop.id)} className="text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100 p-1 rounded-md">
                                                        <Settings size={13}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => togglePlan(shop)} className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all", shop.plan === 'pro' ? "bg-amber-100 border-amber-300 text-amber-900 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                            {shop.plan}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <input type="date" className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-[10px] font-black text-slate-600 outline-none focus:border-indigo-500" value={shop.plan_expiry_date?.split('T')[0] || ''} onChange={e => handleUpdateExpiry(shop.id, e.target.value)} />
                                    </td>
                                    <td className="p-4">
                                        {!expiryDate ? (
                                            <span className="text-[10px] font-bold text-slate-300">Vô thời hạn</span>
                                        ) : isExpired ? (
                                            <span className="text-[10px] font-black text-red-500 uppercase">Đã hết hạn 🛑</span>
                                        ) : (
                                            <span className={cn("text-[10px] font-black uppercase", diffDays <= 7 ? "text-amber-500" : "text-emerald-500")}>
                                                Còn {diffDays} ngày {diffDays <= 7 && '⚠️'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right pr-8">
                                        <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-all">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                                {openShopId === shop.id && (
                                    <tr className="bg-slate-900 text-white animate-in slide-in-from-top-2 duration-300">
                                        <td colSpan={4} className="p-6 pl-16 border-l-4 border-indigo-600 relative">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                {/* ICON CONFIG */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><ImageIcon size={12}/> Hình đại diện (Icon Bot)</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button 
                                                            onClick={() => handleUpdateIcon(shop.id, '/icons/bot-male.png')} 
                                                            className={cn("bg-white/5 p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all", activeIcons[shop.id] === '/icons/bot-male.png' ? "border-indigo-500 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "border-transparent opacity-50 hover:opacity-100")}
                                                        >
                                                            <div className="text-2xl">👨</div>
                                                            <span className="text-[9px] font-black uppercase">BOT NAM</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateIcon(shop.id, '/icons/bot-female.png')} 
                                                            className={cn("bg-white/5 p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all", activeIcons[shop.id] === '/icons/bot-female.png' ? "border-pink-500 bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.5)]" : "border-transparent opacity-50 hover:opacity-100")}
                                                        >
                                                            <div className="text-2xl">👩</div>
                                                            <span className="text-[9px] font-black uppercase">BOT NỮ</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* DEEPLINK CONFIG (SLUG) */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><LinkIcon size={12}/> Tên đuôi link (slug)</p>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="VD: qlady, spa-nha-trang"
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                                                            defaultValue={shop.slug || ''}
                                                            onBlur={(e) => handleUpdateSlug(shop.id, e.target.value)}
                                                        />
                                                        <button className="bg-indigo-600 p-2 rounded-xl text-white" title="Mở Link" onClick={() => window.open(`http://app.dichvupro.net/s/${shop.slug}`, '_blank')}><ExternalLink size={14}/></button>
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-2 italic flex items-center gap-1">Link chuẩn: app.dichvupro.net/s/{shop.slug || '...'}</p>
                                                </div>

                                                {/* ACCOUNT CONFIG */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><Mail size={12}/> Tài khoản & Mật khẩu</p>
                                                    <div className="space-y-4">
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Email đăng nhập:</p>
                                                            <p className="text-xs font-bold font-mono text-indigo-300 truncate">
                                                                {shop.users?.[0]?.email || 'Chưa gán tài khoản'}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => handleResetPassword(shop.id)} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ring-4 ring-amber-500/10 flex items-center justify-center gap-2">
                                                            <Lock size={14}/> ĐỔI MẬT KHẨU
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CÁC TABS KHÁC GIỮ NGUYÊN HOẶC TINH CHỈNH NHẸ */}
        {/* ========================================================================= */}
        {activeTab === 'knowledge' && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-20 px-2 lg:px-0">
            {/* Input Component */}
            <div className="lg:w-1/2 space-y-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl"><BrainCircuit size={28}/></div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">LUYỆN TRI THỨC AI</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Natural Language Processing</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">1. Ngành Hàng</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold focus:border-emerald-500 outline-none" placeholder="VD: Yến Sào" value={industryName} onChange={e => setIndustryName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">2. Tên Gói Tri Thức</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold focus:border-emerald-500 outline-none" placeholder="VD: Gói Khuyến Mãi" value={packageName} onChange={e => setPackageName(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">3. Nội dung thô</label>
                        <textarea rows={10} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-medium focus:border-emerald-500 outline-none shadow-inner" placeholder="Dán văn bản bất kỳ để huấn luyện AI..." value={rawContent} onChange={e => setRawContent(e.target.value)}></textarea>
                    </div>
                    <button onClick={handleProcessKnowledge} disabled={isProcessing || !rawContent.trim()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">{isProcessing ? 'AI Đang huấn luyện...' : 'BẮT ĐẦU LUYỆN'}</button>
                    {processStatus && (
                        <div className={cn("mt-3 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2 duration-300", processStatus.includes('❌') ? "bg-red-50 text-red-600 border border-red-100" : processStatus.includes('✅') ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-inner")}>
                            {processStatus}
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* Warehouse Component */}
            <div className="lg:w-1/2 space-y-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl"><Package size={28}/></div><div><h2 className="text-lg font-black text-slate-900 tracking-tight">KHO GÓI TRI THỨC</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compiled Knowledge Packages</p></div></div></div>
                <div className="flex-1 overflow-y-auto max-h-[450px] space-y-2 pr-2 custom-scrollbar">
                    {knowledgePackages.map(p => (
                        <div key={p.id} className={cn("group p-4 rounded-2xl border-2 transition-all flex items-center justify-between", selectedPackageIds.includes(p.id) ? "bg-indigo-50 border-indigo-200 shadow-md" : "bg-white border-slate-50 hover:border-indigo-100 hover:shadow-sm")}>
                            <div className="flex items-center gap-3 flex-1" onClick={() => { if(selectedPackageIds.includes(p.id)) setSelectedPackageIds(selectedPackageIds.filter(id => id !== p.id)); else setSelectedPackageIds([...selectedPackageIds, p.id]); }}>
                                {selectedPackageIds.includes(p.id) ? <CheckSquare size={20} className="text-indigo-600 shrink-0"/> : <Square size={20} className="text-slate-200 group-hover:text-indigo-200 shrink-0"/>}
                                <div className="min-w-0"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{p.industry_name}</p><p className="text-xs font-black text-slate-800 truncate">{p.package_name}</p></div>
                            </div>
                            <button onClick={() => setEditingPackage(p)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-8 border-t border-slate-100"><div className="space-y-4"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">🎯 Nạp cho mã shop (Space-separated)</label><input type="text" className="w-full bg-slate-900 text-white rounded-2xl p-4 text-lg font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-100 outline-none" placeholder="70WPN 88ABC..." value={targetCodes} onChange={e => setTargetCodes(e.target.value)} /></div><button onClick={handlePushMultiKnowledge} disabled={pushingKnowledge || selectedPackageIds.length === 0} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] text-sm uppercase shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"><Send size={24} className={pushingKnowledge ? "animate-ping" : ""}/>{pushingKnowledge ? 'ĐANG XUẤT XƯỞNG...' : 'XUẤT XƯỞNG TRI THỨC'}</button></div></div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT PACKAGE */}
        {editingPackage && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setEditingPackage(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><Trash2 size={24}/></button>
                    <div className="flex items-center gap-4 mb-10"><div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl"><Edit2 size={28}/></div><div><h2 className="text-2xl font-black text-slate-900">CHỈNH SỬA GÓI TRI THỨC</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Cấu hình nội dung đã đóng gói</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10"><div className="space-y-6"><div><label className="text-[10px] font-black uppercase text-indigo-500 mb-2 block">Tên Gói</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold" value={editingPackage.package_name} onChange={e => setEditingPackage({...editingPackage, package_name: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase text-indigo-500 mb-2 block">1. Mô tả sản phẩm</label><textarea rows={8} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold leading-relaxed" value={editingPackage.product_info} onChange={e => setEditingPackage({...editingPackage, product_info: e.target.value})}></textarea></div></div><div className="space-y-6"><div><label className="text-[10px] font-black uppercase text-emerald-500 mb-2 block">2. Câu hỏi thường gặp (FAQ)</label><textarea rows={12} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold leading-relaxed" value={editingPackage.faq} onChange={e => setEditingPackage({...editingPackage, faq: e.target.value})}></textarea></div></div></div>
                    <button onClick={handleUpdatePackage} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all text-sm uppercase">CẬP NHẬT GÓI DỮ LIỆU</button>
                    <button onClick={() => { if(confirm('Xóa gói?')) supabase.from('knowledge_templates').delete().eq('id', editingPackage.id).then(() => { fetchKnowledgePackages(); setEditingPackage(null); }) }} className="mt-4 w-full text-red-400 text-[10px] font-black uppercase tracking-widest hover:text-red-600">Xóa vĩnh viễn gói này</button>
                </div>
            </div>
        )}

      </div>
      
      {/* OTHER SYSTEM TABS */}
      {activeTab === 'apikeys' && <div className="px-2 lg:px-0"><ApiKeysView showKeys={showKeys} setShowKeys={setShowKeys} apiKey1={apiKey1} setApiKey1={setApiKey1} apiKey2={apiKey2} setApiKey2={setApiKey2} apiKeyPro={apiKeyPro} setApiKeyPro={setApiKeyPro} /></div>}
      {activeTab === 'errors' && <div className="px-2 lg:px-0"><LogsView errorLogs={errorLogs} /></div>}
      {activeTab === 'config' && <div className="px-2 lg:px-0"><SettingsView trialTemplateCode={trialTemplateCode} setTrialTemplateCode={setTrialTemplateCode} /></div>}

      {/* TOAST NOTIFICATIONS (PC/IPAD/MOBILE RESPONSIVE) */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999] flex flex-col gap-3 w-full max-w-[90%] md:max-w-xs pointer-events-none items-end">
          {toasts.map(t => (
            <div key={t.id} className={cn(
                "animate-in slide-in-from-right-10 duration-300 pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-l-[6px] min-w-[280px] md:min-w-0 w-fit",
                t.type === 'error' ? "bg-white border-red-500 text-red-600" : 
                t.type === 'success' ? "bg-white border-emerald-500 text-emerald-600" : 
                "bg-white border-indigo-500 text-indigo-600"
            )}>
              <div className={cn("p-1.5 rounded-lg", t.type === 'error' ? "bg-red-50" : t.type === 'success' ? "bg-emerald-50" : "bg-indigo-50")}>
                {t.type === 'error' ? <AlertTriangle size={18}/> : t.type === 'success' ? <CheckCircle size={18}/> : <Layers size={18}/>}
              </div>
              <p className="text-[11px] md:text-xs font-black uppercase whitespace-nowrap">{t.msg}</p>
            </div>
          ))}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
      `}</style>
    </div>
  );
}

// --- SUB-COMPONENTS (Tách ra để file đỡ dài) ---
function ApiKeysView({showKeys, setShowKeys, apiKey1, setApiKey1, apiKey2, setApiKey2, apiKeyPro, setApiKeyPro}: any) {
    return (
        <div className="max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-2 font-xs"><Key size={16}/> System Encryption Keys</h2>
            <div className="space-y-6">
                {[
                    {id: 'k1', label: 'Gemini Free 1', val: apiKey1, set: setApiKey1}, 
                    {id: 'k2', label: 'Gemini Free 2', val: apiKey2, set: setApiKey2}, 
                    {id: 'kp', label: 'Gemini PRO', val: apiKeyPro, set: setApiKeyPro}
                ].map(k => (
                    <div key={k.id} className="space-y-2">
                        <div className="flex justify-between px-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">{k.label}</label>
                            <button onClick={() => setShowKeys({...showKeys, [k.id]: !showKeys[k.id]})} className="text-[10px] text-indigo-600 font-bold uppercase">{showKeys[k.id] ? 'Hide' : 'Show'}</button>
                        </div>
                        <input type={showKeys[k.id] ? "text" : "password"} value={k.val} onChange={e => k.set(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-mono text-xs outline-none" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function LogsView({errorLogs}: any) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in duration-500">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-2"><AlertTriangle size={16}/> Neural Network Logs (Radar)</h2>
            <div className="space-y-3">
                {errorLogs.length === 0 && <p className="text-center py-10 text-slate-300 font-bold italic">Chưa có ghi nhận lỗi nào...</p>}
                {errorLogs.map((l: any) => (
                    <div key={l.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            {/* Nguồn lỗi label */}
                            <span className={cn(
                                "px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap",
                                l.source === 'API_CHAT_WIDGET' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                            )}>
                                {l.source === 'API_CHAT_WIDGET' ? 'Shop Widget' : 'Xưởng AI'}
                            </span>
                            
                            {/* Thông tin Shop */}
                            {l.shops && (
                                <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-1 rounded shadow-sm">
                                    {l.shops.name} <span className="text-indigo-500">#{l.shops.code}</span>
                                </span>
                            )}

                            {/* Nội dung lỗi */}
                            <span className="text-xs font-bold text-slate-700 truncate">{l.error_message}</span>
                        </div>
                        
                        <div className="text-[10px] font-black text-slate-300 uppercase whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString('vi-VN')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SettingsView({trialTemplateCode, setTrialTemplateCode}: any) {
    return (
        <div className="max-w-xl bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
            <h2 className="text-sm font-black uppercase text-slate-400 mb-8 flex items-center gap-2"><Settings size={16}/> Global Config</h2>
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Shop Mẫu (Auto-Inherit)</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-3xl font-black text-slate-900 uppercase" value={trialTemplateCode} onChange={e => setTrialTemplateCode(e.target.value)} />
                </div>
            </div>
        </div>
    );
}
