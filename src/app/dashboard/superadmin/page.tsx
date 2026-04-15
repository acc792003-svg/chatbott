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
  Bot
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
  
  // States cho Form thêm shop
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'shops' | 'apikeys' | 'errors' | 'config' | 'knowledge'>('shops');

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

  // Trial Template Configuration
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
    const { data, error } = await supabase
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

  // ==================== SHOP MANAGEMENT ====================
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
      const { data, error } = await supabase
        .from('shops')
        .insert({ 
            name: newShopName, 
            code: shopCode,
            plan: 'free'
        })
        .select()
        .single();

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

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa shop "${name}"? Thao tác này sẽ xóa toàn bộ tin nhắn và cấu hình.`)) return;
    
    try {
      const { error } = await supabase.from('shops').delete().eq('id', id);
      if (error) throw error;
      fetchShops();
    } catch (e: any) {
      alert('Lỗi khi xóa: ' + e.message);
    }
  };

  const togglePlan = async (id: string, currentPlan: string) => {
    const newPlan = currentPlan === 'free' ? 'pro' : 'free';
    const expiry = newPlan === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    
    try {
      await supabase.from('shops').update({ 
        plan: newPlan,
        plan_expiry_date: expiry
      }).eq('id', id);
      fetchShops();
    } catch (e) {}
  };

  // ==================== SYSTEM SETTINGS ====================
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
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'trial_template_shop_code', value: trialTemplateCode, requesterId: currentUserId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Đã lưu cấu hình Trial thành công!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // ==================== KNOWLEDGE WORKSHOP ====================
  const handleProcessKnowledge = async () => {
    if (!rawContent.trim()) return alert('Vui lòng nhập nội dung thô!');
    setIsProcessing(true);
    setProcessedResult(null);

    try {
      const res = await fetch('/api/admin/knowledge/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: rawContent, 
          voice: selectedVoice,
          requesterId: currentUserId 
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProcessedResult(data.result);
    } catch (e: any) {
      alert('Lỗi xử lý AI: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePushKnowledge = async () => {
    const codeList = targetCodes.trim().split(/\s+/).filter(c => c.length > 0);
    if (!processedResult || codeList.length === 0) return alert('Thiếu thông tin kết quả hoặc mã shop!');
    setPushingKnowledge(true);

    try {
      const res = await fetch('/api/admin/knowledge/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codes: codeList,
          data: processedResult,
          voice: selectedVoice,
          requesterId: currentUserId
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`🚀 Thành công! Đã cập nhật tri thức cho ${data.count} shops.`);
      setProcessedResult(null);
      setRawContent('');
      setTargetCodes('');
      setSelectedTemplate(null);
    } catch (e: any) {
      alert('Lỗi xuất xưởng: ' + e.message);
    } finally {
      setPushingKnowledge(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!processedResult) return;
    const name = prompt('Nhập tên ngành hàng để lưu mẫu (ví dụ: Mỹ Phẩm Cao Cấp):', selectedTemplate?.industry_name || '');
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
    } catch (e: any) {
        alert('Lỗi khi lưu mẫu: ' + e.message);
    } finally {
        setSavingTemplate(false);
    }
  };

  // ==================== RENDER ====================
  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;
  if (!isSuperAdmin) return <div className="p-8 text-red-600 font-bold">Bạn không có quyền truy cập trang này!</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header Profile */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="text-indigo-600" size={32} />
            SUPER ADMIN
          </h1>
          <p className="text-slate-500 font-medium ml-1">Kiểm soát toàn bộ hệ thống Chatbot AI</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">SA</div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</p>
            <p className="text-sm font-black text-slate-900">Quản trị viên Hệ thống</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('shops')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'shops' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          🏪 Quản lý Shop
        </button>
        <button onClick={() => setActiveTab('apikeys')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'apikeys' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          🔑 API Keys
        </button>
        <button onClick={() => setActiveTab('errors')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'errors' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          ⚠️ Nhật ký lỗi
        </button>
        <button onClick={() => setActiveTab('config')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          ⚙️ Cấu hình
        </button>
        <button onClick={() => { setActiveTab('knowledge'); fetchTemplates(); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'knowledge' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          🏭 Xưởng Tri Thức
        </button>
      </div>

      {/* ==================== TAB: SHOPS ==================== */}
      {activeTab === 'shops' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Add Shop Form */}
          <div className="glass rounded-[2.5rem] p-8 shadow-xl border-white/40 mb-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Plus className="text-indigo-600" size={24} /> Thêm Shop mới
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Nhập tên shop (VD: Yến Sào Tâm An)..." 
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:border-indigo-500 outline-none transition-all"
                value={newShopName}
                onChange={e => setNewShopName(e.target.value)}
              />
              <button 
                onClick={handleCreateShop}
                disabled={addingShop || !newShopName.trim()}
                className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingShop ? 'Đang xử lý...' : 'THÊM NGAY'}
              </button>
            </div>
          </div>

          {/* Shop List Table */}
          <div className="glass rounded-[2.5rem] shadow-xl overflow-hidden border-white/40 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Shop & Code</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Loại gói</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ngày hết hạn</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shops.map(shop => (
                  <tr key={shop.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <p className="font-black text-slate-800 text-sm">{shop.name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 mt-0.5">
                        <Key size={10} /> {shop.code}
                      </p>
                    </td>
                    <td className="p-5">
                      <button 
                        onClick={() => togglePlan(shop.id, shop.plan)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all",
                          shop.plan === 'pro' 
                            ? "bg-amber-100 text-amber-600 border border-amber-200" 
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                        )}
                      >
                        {shop.plan}
                      </button>
                    </td>
                    <td className="p-5">
                      <span className="text-xs font-bold text-slate-600">
                        {shop.plan_expiry_date ? new Date(shop.plan_expiry_date).toLocaleDateString('vi-VN') : '-'}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="p-5">
                      <button 
                        onClick={() => handleDeleteShop(shop.id, shop.name)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB: API KEYS ==================== */}
      {activeTab === 'apikeys' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl max-w-2xl">
          <div className="flex items-center gap-3 mb-8 text-slate-900">
            <div className="p-3 bg-amber-100 rounded-2xl"><Key size={24} className="text-amber-600" /></div>
            <div>
                <h2 className="text-xl font-black">Quản lý API Keys</h2>
                <p className="text-sm text-slate-500 font-medium">Cấu hình khóa Gemini cho toàn hệ thống.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-400 ml-1">Gemini API Key 1 (Mặc định)</label>
              <input 
                type="password" 
                value={apiKey1} 
                onChange={e => setApiKey1(e.target.value)}
                placeholder="Nhập khóa API dự phòng..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-sm focus:border-amber-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-400 ml-1">Gemini API Key 2 (Dự phòng)</label>
              <input 
                type="password" 
                value={apiKey2} 
                onChange={e => setApiKey2(e.target.value)}
                placeholder="Nhập khóa API dự phòng..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-sm focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-400 ml-1">🌟 Gemini API Key PRO (Ưu tiên)</label>
              <input 
                type="password" 
                value={apiKeyPro} 
                onChange={e => setApiKeyPro(e.target.value)}
                placeholder="Khóa riêng cho người dùng gói PRO..."
                className="w-full bg-amber-50 border-2 border-amber-100 rounded-xl p-4 font-mono text-sm focus:border-amber-600 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2 border-t pt-4">
              <label className="block text-xs font-black uppercase text-slate-400 ml-1">🔗 Facebook Webhook Verify Token</label>
              <input 
                type="text" 
                value={fbVerifyToken} 
                onChange={e => setFbVerifyToken(e.target.value)}
                placeholder="Mã xác thực Webhook Meta..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <button 
              onClick={handleSaveApiKeys}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest"
            >
              LƯU TẤT CẢ KEY
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB: ERROR LOGS ==================== */}
      {activeTab === 'errors' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 ">
                <div className="p-3 bg-red-100 rounded-2xl"><AlertTriangle size={24} className="text-red-600" /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Nhật ký Lỗi Hệ thống</h2>
                  <p className="text-sm text-slate-500 font-medium">Ghi lại các sự cố từ các chatbot đang chạy.</p>
                </div>
            </div>
            <button onClick={fetchErrorLogs} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-all text-slate-600">
                Làm mới
            </button>
          </div>

          <div className="space-y-3">
            {errorLogs.length === 0 && <p className="text-center py-10 text-slate-400 font-bold italic">Tất cả ổn định, chưa có lỗi nào được ghi nhận. 🎉</p>}
            {errorLogs.map(log => (
              <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-black uppercase">{log.error_type}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nguồn: {log.source}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{log.error_message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: CONFIG ==================== */}
      {activeTab === 'config' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl max-w-2xl">
          <div className="flex items-center gap-3 mb-6 font-black text-slate-900">
             <div className="p-3 bg-indigo-100 rounded-2xl"><Settings size={24} /></div>
             <div>
                <h2 className="text-xl">Cấu hình Hệ thống</h2>
                <p className="text-sm text-slate-500">Quản lý các thông số vận hành chung.</p>
             </div>
          </div>
          
          <div className="space-y-6">
            <div>
               <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Mã Shop Mẫu (Dành cho Trial)</label>
               <input 
                 type="text" 
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-sm focus:border-indigo-500 outline-none"
                 placeholder="VD: 70WPN"
                 value={trialTemplateCode}
                 onChange={e => setTrialTemplateCode(e.target.value.toUpperCase())}
               />
               <p className="text-[11px] text-slate-400 mt-2 font-medium">Hệ thống sẽ bốc Tri thức của shop này để nạp cho khách dùng thử.</p>
            </div>

            <button 
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {savingConfig ? 'Đang lưu...' : 'LƯU CẤU HÌNH'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB: KNOWLEDGE WORKSHOP ==================== */}
      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 max-w-7xl mx-auto">
          {/* Cột 1: Input & Presets */}
          <div className="space-y-6">
            <div className="glass rounded-[2.5rem] p-8 shadow-xl border-white/40">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-2xl">🏭</div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Xưởng Tri Thức</h2>
                  <p className="text-sm text-slate-500 font-medium">Huấn luyện AI cho từng ngành hàng.</p>
                </div>
              </div>

              {/* Mẫu ngành hiện có (Presets) */}
              <div className="mb-8">
                <label className="block text-xs font-black uppercase text-slate-400 mb-3 ml-1">📦 Mẫu ngành hiện có:</label>
                <div className="flex flex-wrap gap-2">
                    {knowledgeTemplates.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => {
                                setSelectedTemplate(t);
                                setRawContent(t.example_content || '');
                                if (t.product_info) {
                                  setProcessedResult({
                                    product_info: t.product_info,
                                    faq: t.faq || '',
                                    insights: t.insights || ''
                                  });
                                } else {
                                  setProcessedResult(null);
                                }
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                                selectedTemplate?.id === t.id 
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105" 
                                    : "bg-white text-slate-600 border-slate-100 hover:border-emerald-200"
                            )}
                        >
                            {t.industry_name}
                        </button>
                    ))}
                    {knowledgeTemplates.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có mẫu nào được lưu.</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">📄 Nguyên liệu thô (Dán văn bản)</label>
                    <textarea 
                        rows={10}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all"
                        placeholder="Hãy dán các bài viết, tin nhắn cũ, tài liệu sản phẩm vào đây..."
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                    ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">🎭 Giọng văn AI</label>
                        <select 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                        >
                            <option value="nhẹ nhàng">🌸 Nhẹ nhàng, ấm áp</option>
                            <option value="bán hàng">🔥 Bán hàng chuyên nghiệp</option>
                            <option value="sang trọng">💎 Sang trọng, đẳng cấp</option>
                            <option value="hài hước">🤣 Duyên dáng, hóm hỉnh</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">🏪 Cấp cho Shop (Mã Code)</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none uppercase"
                            placeholder="70WPN 88ABC..."
                            value={targetCodes}
                            onChange={(e) => setTargetCodes(e.target.value)}
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">Nhiều cửa hàng cách nhau dấu cách.</p>
                    </div>
                </div>

                <button 
                    onClick={handleProcessKnowledge}
                    disabled={isProcessing || !rawContent.trim()}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            AI ĐANG "NẤU" TRI THỨC...
                        </>
                    ) : (
                        <>🔥 BẮT ĐẦU LUYỆN TRI THỨC MỚI</>
                    )}
                </button>
              </div>
            </div>
          </div>

          {/* Cột 2: Thành phẩm & Edit */}
          <div className="space-y-6">
            <div className="glass rounded-[2.5rem] p-8 shadow-xl border-white/40 h-full flex flex-col min-h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-2xl">✨</div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Kết Quả Tri Thức</h2>
                        <p className="text-sm text-slate-500 font-medium">Chỉnh sửa nếu cần rồi nạp cho Shop.</p>
                    </div>
                </div>
                {processedResult && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePushKnowledge}
                            disabled={pushingKnowledge}
                            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs hover:bg-blue-700 shadow-xl transition-all"
                        >
                            {pushingKnowledge ? '...' : '🚀 XUẤT XƯỞNG'}
                        </button>
                        <button 
                            onClick={handleSaveAsTemplate}
                            disabled={savingTemplate}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                            title="Lưu vào kho để dùng cho các Shop PRO khác"
                        >
                            {savingTemplate ? '...' : '💾 LƯU MẪU'}
                        </button>
                    </div>
                )}
              </div>

              {processedResult ? (
                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-blue-500 uppercase mb-2">📦 Tóm tắt sản phẩm</label>
                        <textarea 
                            className="w-full text-sm font-bold leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-none"
                            rows={8}
                            value={processedResult.product_info}
                            onChange={(e) => setProcessedResult({...processedResult, product_info: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-emerald-500 uppercase mb-2">❓ FAQ - Hỏi đáp</label>
                        <textarea 
                            className="w-full text-sm font-bold leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-none"
                            rows={10}
                            value={processedResult.faq}
                            onChange={(e) => setProcessedResult({...processedResult, faq: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                        <label className="block text-[10px] font-black text-amber-600 uppercase mb-2">💡 Tuyệt chiêu níu kéo khách</label>
                        <textarea 
                            className="w-full text-sm font-bold leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-none italic text-slate-600"
                            rows={6}
                            value={processedResult.insights}
                            onChange={(e) => setProcessedResult({...processedResult, insights: e.target.value})}
                        ></textarea>
                    </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 grayscale">
                    <div className="w-24 h-24 bg-slate-100 rounded-full mb-4 flex items-center justify-center text-5xl">🧪</div>
                    <p className="font-bold text-slate-900 text-lg">Chưa có "Thành Phẩm"</p>
                    <p className="text-sm">Vui lòng chọn Mẫu ngành hoặc nạp dữ liệu thô để bắt đầu.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
