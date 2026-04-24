'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Key, AlertTriangle, Plus, Trash2, Search, CheckCircle, Settings, Database,
  ArrowRight, TrendingUp, BrainCircuit, Bot, LogIn, Edit2, Calendar, Layers, Eye, EyeOff,
  User, Lock, Image as ImageIcon, CheckSquare, Square, Package, Send, ExternalLink, Link as LinkIcon, Mail, Copy,
  Brain, MessageCircle, Info, Activity, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TelegramMonitor from '@/components/admin/TelegramMonitor';
import AiAnalytics from '@/components/admin/AiAnalytics';
import ChatHistoryMonitor from '@/components/admin/ChatHistoryMonitor';
import KeywordManagement from './KeywordManagement';

// Sub-components are now imported from ./sub-components.tsx
import { ApiKeysView, LogsView, SettingsView } from './sub-components';

type Shop = {
  id: string;
  name: string;
  code: string;
  plan: 'free' | 'pro';
  plan_expiry_date: string | null;
  created_at: string;
  slug?: string; // Tên đuôi deeplink (qlady)
  users?: { email: string; id: string }[]; // Tài khoản gán với shop
  fb_page_id?: string;
  fb_page_token?: string;
  manychat_api_key?: string;
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
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [apiKey1, setApiKey1] = useState('');
  const [apiKey2, setApiKey2] = useState('');
  const [apiKeyPro, setApiKeyPro] = useState('');
  const [deepSeekKeyFree1, setDeepSeekKeyFree1] = useState('');
  const [deepSeekKeyFree2, setDeepSeekKeyFree2] = useState('');
  const [deepSeekKeyPro, setDeepSeekKeyPro] = useState('');
  const [fbVerifyToken, setFbVerifyToken] = useState('');
  const [fbAppSecret, setFbAppSecret] = useState('');
  const [systemTelegramToken, setSystemTelegramToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'knowledge' | 'keywords' | 'apikeys' | 'errors' | 'config' | 'telegram' | 'analytics' | 'facebook'>('shops');
  const [userRole, setUserRole] = useState<string>(''); // Lưu role thực tế (super_admin hoặc staff_admin)
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  // Shop Management
  const [newShopName, setNewShopName] = useState('');
  const [nextGeneratedCode, setNextGeneratedCode] = useState(''); // Lưu mã sẽ được tạo tiếp theo
  const [addingShop, setAddingShop] = useState(false);
  const [openShopId, setOpenShopId] = useState<string | null>(null);
  const [activeIcons, setActiveIcons] = useState<{ [key: string]: string }>({});
  const [showManyChatKeys, setShowManyChatKeys] = useState<{ [key: string]: boolean }>({});

  // Knowledge Workshop
  const [bulkRawFaq, setBulkRawFaq] = useState(''); // Ô nhập hàng loạt
  const [targetCodes, setTargetCodes] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [processedResult, setProcessedResult] = useState<any>(null);
  const [knowledgePackages, setKnowledgePackages] = useState<KnowledgePackage[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [editingPackage, setEditingPackage] = useState<KnowledgePackage | null>(null);
  const [pushingKnowledge, setPushingKnowledge] = useState(false);

  // System Config & Stats
  const [trialTemplateCode, setTrialTemplateCode] = useState('');
  const [systemStats, setSystemStats] = useState<any>(null);

  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => { 
    checkUser();
    
    // THIẾT LẬP REALTIME CHO NHẬT KÝ LỖI (Radar 24/7)
    const channel = supabase
      .channel('admin-radar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        (payload: any) => {
           fetchErrorLogs();
           addToast(`📦 Log mới: ${payload.new.error_message?.substring(0, 30)}...`, 'info');
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_errors' },
        (payload: any) => {
           fetchErrorLogs();
           addToast(`🚨 LỖI RADAR: ${payload.new.error_type} - ${payload.new.error_message?.substring(0, 50)}`, 'error');
           
           // 🔥 Phản xạ âm thanh (tùy chọn) hoặc rung nhẹ nếu cần ở đây
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000); // Tăng thời gian hiển thị lên 8s để Admin kịp nhìn mã
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return `CB-${res}`;
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setCurrentUserId(user.id);
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    
    // Nếu là super_admin hoặc staff_admin thì mới cho vào
    if (userData?.role === 'super_admin' || userData?.role === 'staff_admin') {
      setUserRole(userData.role);
      setNextGeneratedCode(generateCode()); // Sinh mã sẵn sàng
      fetchShops();
      fetchErrorLogs();
      fetchKnowledgePackages();
      
      // Chỉ Super Admin mới fetch thêm các cấu hình nhạy cảm
      if (userData.role === 'super_admin') {
          fetchApiKeys();
          fetchTrialConfig();
          fetchSystemStats();
      }
    } else { 
        window.location.href = '/login'; 
    }
  };

  const fetchSystemStats = async () => {
    try {
        const res = await fetch('/api/admin/system/stats');
        const data = await res.json();
        if (data.keys) setSystemStats(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (userRole === 'super_admin') {
      const interval = setInterval(fetchSystemStats, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const [shopPackages, setShopPackages] = useState<any>({});

  const fetchShops = async () => {
    try {
        // Lấy token từ session hiện tại của Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch('/api/admin/shops', {
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            }
        });
        const data = await res.json();
        
        if (data && !data.error) {
            setShops(data);
            const { data: configs } = await supabase.from('chatbot_configs').select('shop_id, head_icon');
            const iconMap: any = {};
            configs?.forEach((c: any) => iconMap[c.shop_id] = c.head_icon);
            setActiveIcons(iconMap);

            const pkgMap: any = {};
            data.forEach((s: any) => {
                if (s.packages && s.packages.length > 0) {
                    pkgMap[s.id] = s.packages;
                }
            });
            setShopPackages(pkgMap);
        } else if (data.error) {
            console.error('API Error:', data.error);
        }
    } catch (e) {
        console.error('Lỗi khi load danh sách shop:', e);
        addToast('Lỗi khi tải danh sách Shop. Đang dùng data cũ.', 'error');
    } finally {
        setLoading(false);
    }
  };

  const fetchKnowledgePackages = async () => {
    try {
        const res = await fetch('/api/admin/knowledge-templates?ts=' + Date.now());
        const data = await res.json();
        if (data.templates) setKnowledgePackages(data.templates);
    } catch (e) {
        console.error("Lỗi lấy Knowledge Packages:", e);
    }
  };

  const fetchErrorLogs = async () => {
    // 1. Lấy log cũ
    const { data: oldLogs } = await supabase
        .from('error_logs')
        .select('*, shops(name, code)')
        .order('created_at', { ascending: false })
        .limit(20);
    
    // 2. Lấy log hệ thống mới (Phase 3)
    const { data: newLogs } = await supabase
        .from('system_errors')
        .select('*, shops(name, code)')
        .order('created_at', { ascending: false })
        .limit(30);

    const combined = [
        ...(oldLogs || []).map((l: any) => ({ ...l, type: 'legacy' })),
        ...(newLogs || []).map((l: any) => ({ ...l, type: 'critical' }))
    ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setErrorLogs(combined);
  };

  const fetchApiKeys = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      setApiKey1(data.find((d: any) => d.key === 'gemini_api_key_1')?.value || '');
      setApiKey2(data.find((d: any) => d.key === 'gemini_api_key_2')?.value || '');
      setApiKeyPro(data.find((d: any) => d.key === 'gemini_api_key_pro')?.value || '');
      setDeepSeekKeyFree1(data.find((d: any) => d.key === 'deepseek_api_key_free1')?.value || '');
      setDeepSeekKeyFree2(data.find((d: any) => d.key === 'deepseek_api_key_free2')?.value || '');
      setDeepSeekKeyPro(data.find((d: any) => d.key === 'deepseek_api_key_pro')?.value || '');
      setFbVerifyToken(data.find((d: any) => d.key === 'fb_verify_token')?.value || '');
      setFbAppSecret(data.find((d: any) => d.key === 'fb_app_secret')?.value || '');
      setSystemTelegramToken(data.find((d: any) => d.key === 'system_telegram_bot_token')?.value || '');
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
    const code = nextGeneratedCode; // Dùng mã đã sinh sẵn

    // Tính toán ngày mai (1 ngày dùng thử)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    try {
      const codeToUse = code || generateCode(); 
      const { data: newShop, error } = await supabase.from('shops').insert({ 
        name: newShopName, 
        code: codeToUse, 
        plan: 'free',
        plan_expiry_date: tomorrow.toISOString()
      }).select().single();
      
      if (error) throw error;

      // Mặc định khóa cấu hình (Mã ngẫu nhiên)
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      await supabase.from('system_settings').insert({
          key: `shop_config_pin_${newShop.id}`,
          value: randomPin
      });

      // Thông báo siêu lớn và rõ ràng
      addToast(`🎉 CHÚC MỪNG! ĐÃ TẠO THÀNH CÔNG SHOP: ${newShopName.toUpperCase()}`, 'success');
      addToast(`🔑 MÃ TRUY CẬP CỦA SHOP LÀ: ${codeToUse}`, 'success');
      
      setNewShopName(''); 
      setNextGeneratedCode(generateCode()); 
      fetchShops();
    } catch (e: any) { 
        addToast(e.message, 'error');
    } finally { setAddingShop(false); }
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
    if (userRole !== 'super_admin') {
      addToast('Bạn không có quyền thực hiện hành động này.', 'error');
      return;
    }
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN shop "${name.toUpperCase()}"? \nMọi dữ liệu Leads, Chatbot, Knowledge sẽ bị xóa sạch và không thể khôi phục.`)) return;
    
    addToast(`Đang xóa shop ${name}...`, 'info');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/shops/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Lỗi khi xóa shop');

      addToast(`Đã xóa thành công shop: ${name}`, 'success');
      fetchShops();
    } catch (e: any) { 
      addToast(`Lỗi xóa shop: ${e.message}`, 'error');
      console.error(e);
    }
  };

  const handleRemovePackage = async (shopId: string, templateId: string) => {
    if (!confirm('Bạn có chắc muốn gỡ bỏ Gói Tri Thức này khỏi shop?')) return;
    try {
        const { error } = await supabase.from('shop_templates').delete().match({ shop_id: shopId, template_id: templateId });
        if (error) throw error;
        addToast('Đã gỡ bỏ gói tri thức khỏi shop!', 'success');
        fetchShops();
    } catch (e: any) {
        addToast('Lỗi khi gỡ gói: ' + e.message, 'error');
    }
  };

  const handleResetPassword = async (shopId: string) => {
    const pass = prompt('Mật khẩu mới:');
    if (!pass) return;

    addToast('Đang xử lý đổi mật khẩu...', 'info');
    try {
      const res = await fetch('/api/admin/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ shopId, newPassword: pass, requesterId: currentUserId }) 
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        addToast(`✅ Đã đổi mật khẩu thành công!`, 'success');
      } else {
        addToast(`❌ Lỗi: ${data.error || 'Server error'}`, 'error');
      }
    } catch (e: any) {
      addToast(`❌ Lỗi kết nối: ${e.message}`, 'error');
    }
  };

  const handleUpdateIcon = async (shopId: string, url: string) => {
    // Sử dụng upsert: Nếu shop chưa có dòng config thì tạo mới, có rồi thì cập nhật
    const { error } = await supabase.from('chatbot_configs').upsert({ 
      shop_id: shopId, 
      head_icon: url,
      updated_at: new Date().toISOString()
    }, { onConflict: 'shop_id' });

    if (error) {
      addToast('Lỗi khi lưu icon: ' + error.message, 'error');
      return;
    }

    setActiveIcons(prev => ({ ...prev, [shopId]: url }));
    addToast('Đã đổi icon bot thành công!', 'success');
  };

  const handleUpdateFBConfig = async (shopId: string, pageId: string, accessToken: string) => {
    const { error } = await supabase.from('channel_configs').upsert({ 
      shop_id: shopId,
      channel_type: 'facebook',
      provider_id: pageId.trim(), 
      access_token: accessToken.trim() 
    }, { onConflict: 'shop_id, channel_type' });

    if (error) {
        addToast(`Lỗi cấu hình FB: ${error.message}`, 'error');
    } else {
        // Cập nhật ngược lại shop để hiển thị UI nhanh (Optional)
        await supabase.from('shops').update({ 
            fb_page_id: pageId.trim(), 
            fb_page_token: accessToken.trim() 
        }).eq('id', shopId);
        
        addToast(`Đã bọc thép cấu hình Facebook!`, 'success');
        fetchShops();
    }
  };

  const handleRegenerateManyChatKey = async (shopId: string) => {
    const newKey = "mc_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
        const { error } = await supabase.from('shops').update({ manychat_api_key: newKey }).eq('id', shopId);
        if (error) throw error;
        addToast('Đã tạo API Key mới thành công!', 'success');
        fetchShops();
    } catch (e: any) {
        addToast('Lỗi khi tạo key: ' + e.message, 'error');
    }
  };

  // ==================== KNOWLEDGE WORKSHOP ACTIONS ====================
  const handleProcessKnowledge = async () => {
    if (!industryName.trim()) {
        addToast('Lỗi: Bạn chưa nhập thông tin Ngành Hàng (1)', 'error');
        return;
    }
    if (!packageName.trim()) {
        addToast('Lỗi: Bạn chưa nhập Tên Gói Tri Thức (2)', 'error');
        return;
    }
    if (!bulkRawFaq.trim()) {
        addToast('Lỗi: Bạn chưa dán nội dung Tri Thức (3)', 'error');
        return;
    }

    // LOGIC PARSING: Tách nội dung thành mảng FAQ
    // Quy tắc: Q: ... A: ...
    const lines = bulkRawFaq.split('\n');
    const faqList: {q: string, a: string}[] = [];
    let currentQ = '';
    let currentA = '';

    lines.forEach(line => {
        const cleanLine = line.trim();
        const upperLine = cleanLine.toUpperCase();
        if (upperLine.startsWith('Q:') || upperLine.startsWith('QUESTION:') || upperLine.startsWith('HỎI:')) {
            if (currentQ && currentA) faqList.push({ q: currentQ, a: currentA });
            currentQ = cleanLine.replace(/^(Q:|QUESTION:|HỎI:)\s*/i, '');
            currentA = '';
        } else if (upperLine.startsWith('A:') || upperLine.startsWith('ANSWER:') || upperLine.startsWith('ĐÁP:') || upperLine.startsWith('TRẢ LỜI:')) {
            currentA = cleanLine.replace(/^(A:|ANSWER:|ĐÁP:|TRẢ LỜI:)\s*/i, '');
        } else if (cleanLine && currentA) {
            currentA += '\n' + cleanLine; // Hỗ trợ câu trả lời nhiều dòng bằng newline
        }
    });
    if (currentQ && currentA) faqList.push({ q: currentQ, a: currentA });

    if (faqList.length === 0) {
        setProcessStatus('❌ Định dạng FAQ không đúng (Cần Q: và A:)');
        return;
    }
    
    setIsProcessing(true);
    setProcessStatus(`🤖 Đang xử lý ${faqList.length} câu hỏi...`);
    
    try {
      const res = await fetch('/api/admin/knowledge/process', { 
        method: 'POST', 
        body: JSON.stringify({ 
          faqList, 
          industryName, 
          packageName, 
          requesterId: currentUserId 
        }) 
      });
      
      const data = await res.json();
      
      if (data.error) {
        setProcessStatus(`❌ Lỗi AI: ${data.error}`);
        addToast(`Lỗi AI: ${data.error}`, 'error');
        return;
      }
      
      if (data.success) {
        setProcessStatus('✅ HOÀN THÀNH!');
        addToast(`Đã luyện thành công gói: ${packageName}`, 'success');
        setBulkRawFaq(''); 
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
    const codeList = targetCodes.trim().toUpperCase().split(/\s+/).filter(c => c.length > 0);
    if (selectedPackageIds.length === 0 || codeList.length === 0) return alert('Chưa chọn mã shop!');
    setPushingKnowledge(true);
    try {
        const pkgs = knowledgePackages.filter(p => selectedPackageIds.includes(p.id));
        const combined = {
            product_info: pkgs.map(p => `[${p.package_name}]\n${p.product_info}`).join('\n\n---\n\n'),
            faq: pkgs.map(p => `--- Gói: ${p.package_name} ---\n${p.faq}`).join('\n\n'),
            insights: pkgs.map(p => p.insights).join('\n\n')
        };
        const res = await fetch('/api/admin/knowledge/push', { 
            method: 'POST', 
            body: JSON.stringify({ 
                codes: codeList, 
                data: combined, 
                templateIds: selectedPackageIds,
                voice: 'nhẹ nhàng', 
                requesterId: currentUserId 
            }) 
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            addToast(`Lỗi xuất xưởng: ${data.error || 'Server Error'}`, 'error');
            return;
        }
        addToast(`🚀 Đã xuất xưởng thành công cho ${data.count} shop!`, 'success');
        setSelectedPackageIds([]); setTargetCodes('');
    } catch (e) { 
        addToast('Lỗi xuất xưởng dữ liệu!', 'error');
    } finally { setPushingKnowledge(false); }
  };

  const handleSaveSystemSettings = async (type: 'api' | 'config') => {
    try {
        const settings = [];
        if (type === 'api') {
            settings.push({ key: 'gemini_api_key_1', value: apiKey1 });
            settings.push({ key: 'gemini_api_key_2', value: apiKey2 });
            settings.push({ key: 'gemini_api_key_pro', value: apiKeyPro });
            settings.push({ key: 'deepseek_api_key_free1', value: deepSeekKeyFree1 });
            settings.push({ key: 'deepseek_api_key_free2', value: deepSeekKeyFree2 });
            settings.push({ key: 'deepseek_api_key_pro', value: deepSeekKeyPro });
            settings.push({ key: 'fb_verify_token', value: fbVerifyToken });
            settings.push({ key: 'fb_app_secret', value: fbAppSecret });
            settings.push({ key: 'system_telegram_bot_token', value: systemTelegramToken });
        } else {
            settings.push({ key: 'trial_template_shop_code', value: trialTemplateCode });
        }

        const { error } = await supabase.from('system_settings').upsert(settings, { onConflict: 'key' });
        if (error) throw error;
        
        addToast(`Đã lưu ${type === 'api' ? 'cấu hình API' : 'cài đặt chung'} thành công!`, 'success');
        fetchApiKeys();
        fetchTrialConfig();
    } catch (e: any) {
        addToast(`Lỗi lưu cài đặt: ${e.message}`, 'error');
    }
  };

  const handleTestTelegram = async (shopId: string) => {
    addToast('⏳ Đang gửi tin nhắn thử nghiệm...', 'info');
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: config } = await supabase.from('chatbot_configs').select('telegram_chat_id, telegram_bot_token, shop_name').eq('shop_id', shopId).single();
        if (!config?.telegram_chat_id) {
            addToast('❌ Shop chưa cấu hình Chat ID!', 'error');
            return;
        }

        const res = await fetch('/api/admin/telegram/test', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                chatId: config.telegram_chat_id,
                botToken: config.telegram_bot_token,
                shopName: config.shop_name
            })
        });
        
        if (res.ok) {
            addToast('✅ Đã gửi tin nhắn test thành công!', 'success');
        } else {
            const err = await res.json();
            addToast(`❌ Lỗi: ${err.error}`, 'error');
        }
    } catch (e) {
        addToast('Lỗi kết nối!', 'error');
    }
  };

  // Filtered Shops
  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8 text-xs font-bold text-slate-400">SYNCING ADMIN CORE...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#F0F2F5] to-indigo-50/30 text-slate-800 p-2 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto focus-within:outline-none">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 px-2 mt-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_20px_-5px_rgba(99,102,241,0.5)] transform transition-transform hover:scale-105 hover:rotate-3"><Settings size={22}/></div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 bg-clip-text text-transparent leading-none tracking-tight">SUPER CONTROL</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1.5 tracking-[0.2em] bg-indigo-50 w-fit px-2.5 py-0.5 rounded-full border border-indigo-100/50">Enterprise Management</p>
            </div>
          </div>
          <div className="flex items-center gap-5 bg-white/60 backdrop-blur-md border border-white p-2.5 pr-4 rounded-3xl shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-tr from-slate-900 to-slate-700 text-white rounded-full flex items-center justify-center font-black text-xs shadow-inner">SA</div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Nodes</p>
                <p className="text-base font-black text-slate-900 leading-none">{shops.length}</p>
              </div>
          </div>
        </div>

        {/* TABS GROUPED */}
        <div className="flex flex-col xl:flex-row gap-4 mb-10 w-full px-2 lg:px-0">
          
          {/* Group 1: Hệ thống lõi */}
          <div className="bg-white/80 backdrop-blur-2xl p-3 rounded-[2rem] shadow-xl shadow-indigo-100/40 border border-white flex-1 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
             <div className="text-[10px] font-black uppercase text-indigo-500 mb-3 px-3 tracking-widest flex items-center gap-1.5"><Settings size={14}/> HỆ THỐNG LÕI (CORE)</div>
             <div className="flex flex-wrap gap-2">
               {[
                 { id: 'shops', label: 'Cửa hàng', icon: <Users size={14}/> },
                 { id: 'apikeys', label: 'Cấu hình API', icon: <Key size={14}/>, adminOnly: true },
                 { id: 'config', label: 'Cài đặt chung', icon: <Settings size={14}/>, adminOnly: true },
               ].filter(tab => !tab.adminOnly || userRole === 'super_admin').map((tab) => (
                 <button 
                   key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                   className={cn("px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all outline-none", activeTab === tab.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-200/50 scale-105 z-10" : "text-slate-500 bg-slate-50/50 hover:bg-slate-100 hover:text-indigo-600 hover:scale-[1.02]")}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>
          </div>

          {/* Group 2: Tri Thức AI */}
          <div className="bg-white/80 backdrop-blur-2xl p-3 rounded-[2rem] shadow-xl shadow-emerald-100/40 border border-white flex-1 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
             <div className="text-[10px] font-black uppercase text-emerald-600 mb-3 px-3 tracking-widest flex items-center gap-1.5"><BrainCircuit size={14}/> TRÍ NÃO (AI KNOWLEDGE)</div>
             <div className="flex flex-wrap gap-2">
               {[
                 { id: 'analytics', label: 'Phân tích AI', icon: <Brain size={14}/> },
                 { id: 'knowledge', label: 'Xưởng Tri Thức', icon: <BrainCircuit size={14}/> },
                 { id: 'keywords', label: 'Từ khóa (Intent)', icon: <Layers size={14}/> },
               ].map((tab) => (
                 <button 
                   key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                   className={cn("px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all outline-none", activeTab === tab.id ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50 scale-105 z-10" : "text-slate-500 bg-slate-50/50 hover:bg-slate-100 hover:text-emerald-600 hover:scale-[1.02]")}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>
          </div>

          {/* Group 3: Kênh Giao Tiếp & Giám Sát */}
          <div className="bg-white/80 backdrop-blur-2xl p-3 rounded-[2rem] shadow-xl shadow-rose-100/40 border border-white flex-1 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -z-10"></div>
             <div className="text-[10px] font-black uppercase text-rose-600 mb-3 px-3 tracking-widest flex items-center gap-1.5"><Send size={14}/> KÊNH PHÂN PHỐI & GIÁM SÁT</div>
             <div className="flex flex-wrap gap-2">
               {[
                 { id: 'telegram', label: 'Kênh Telegram', icon: <Send size={14}/>, adminOnly: true },
                 { id: 'facebook', label: 'Kênh Facebook', icon: <MessageCircle size={14}/>, adminOnly: true },
                 { id: 'errors', label: 'Nhật ký lỗi', icon: <AlertTriangle size={14}/> },
               ].filter(tab => !tab.adminOnly || userRole === 'super_admin').map((tab) => (
                 <button 
                   key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                   className={cn("px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all outline-none", activeTab === tab.id ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-200/50 scale-105 z-10" : "text-slate-500 bg-slate-50/50 hover:bg-slate-100 hover:text-rose-600 hover:scale-[1.02]")}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>
          </div>

        </div>

        {/* --- SYSTEM RADAR (QUICK INSIGHTS) --- */}
        {userRole === 'super_admin' && systemStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 px-2">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><TrendingUp size={12} className="text-indigo-600"/> Tỷ lệ Cache (Tiết kiệm)</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-slate-900">{systemStats.performance?.cacheRatio}%</h3>
                        <span className="text-[10px] font-bold text-emerald-600 mb-1 lg:block hidden">Tiết kiệm API</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Plus size={12} className="text-amber-600"/> AI Generation</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-slate-900">{systemStats.performance?.aiRatio}%</h3>
                        <span className="text-[10px] font-bold text-slate-500 mb-1 lg:block hidden">Lượt gọi AI</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2"><Database size={12} className="text-indigo-600"/> Request 24h</p>
                    <h3 className="text-3xl font-black text-slate-900">{systemStats.performance?.totalRequests}</h3>
                </div>
                <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-100 text-white group hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black text-white/90 uppercase tracking-widest mb-1 flex items-center gap-2"><BrainCircuit size={12}/> AI Multi-Key Status</p>
                    <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex gap-1.5">
                            {systemStats.keys?.map((k: any, i: number) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-sm transition-all", 
                                        k.status === 'healthy' && k.error === 0 ? "bg-emerald-400 text-white border-indigo-500" : 
                                        k.status === 'healthy' && k.error > 0 ? "bg-orange-400 text-white border-orange-600" : 
                                        k.status === 'cooldown' ? "bg-amber-400 text-amber-900 border-indigo-500" : 
                                        k.status === 'missing' ? "bg-slate-800 text-slate-400 border-slate-600" :
                                        "bg-red-500 text-white border-red-700"
                                    )} 
                                    title={`${k.name}: ${k.status.toUpperCase()} (${k.error} lỗi)`}
                                >
                                    {k.status === 'missing' ? 'X' : 
                                     (k.name === 'Key 1' ? '1' : k.name === 'Key 2' ? '2' : k.name === 'Key PRO' ? 'P' : 'E')}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-black uppercase text-white/80 tracking-tighter">Nodes Online</span>
                    </div>
                </div>
            </div>
        )}

        {/* ==================== TAB: SHOPS ==================== */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 px-2 lg:px-0">
            <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Tìm theo Tên, Mã hoặc Link (QLADY)..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:border-indigo-500 outline-none shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-2 items-end w-full">
                    <button 
                        onClick={fetchShops} 
                        className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        title="Tải lại danh sách"
                    >
                        <Activity size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-indigo-500 uppercase ml-2 tracking-widest border-b-2 border-indigo-100 w-fit">
                            {newShopName.trim() ? `✨ MÃ SẼ TẠO: ${nextGeneratedCode}` : 'Nhập tên cửa hàng mới'}
                        </label>
                        <input type="text" placeholder="Ví dụ: Yến Sào Phương Nam..." className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold w-full md:w-64 shadow-sm focus:border-indigo-500 outline-none transition-all" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                    </div>
                    <button 
                        onClick={handleCreateShop} 
                        disabled={addingShop || userRole !== 'super_admin'} 
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all h-[38px] w-full md:w-auto",
                            userRole === 'super_admin' ? "bg-indigo-600 text-white active:scale-95" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {addingShop ? 'ĐANG TẠO...' : (userRole === 'super_admin' ? '+ TẠO SHOP' : 'KHÓA')}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase pl-6">Thông tin Cửa hàng</th>
                            <th className="p-4 text-[10px] font-black text-indigo-400 uppercase text-center w-36 bg-indigo-50/30">Mã Shop (Code)</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-28">Gói Dùng</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-36">Thời hạn dùng</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredShops.map((shop: any) => {
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
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {shop.slug && <span className="text-[10px] font-black text-emerald-600 tracking-tighter bg-emerald-50 px-1.5 py-1 rounded-lg leading-none">/{shop.slug}</span>}
                                                    {shopPackages[shop.id]?.[0] && <span className="text-[9px] font-black text-indigo-500 uppercase bg-indigo-50 px-1.5 py-1 rounded-md border border-indigo-100 truncate max-w-[100px]" title={shopPackages[shop.id].map((p: any) => p.name).join(', ')}>{shopPackages[shop.id][0].name}</span>}
                                                    {shopPackages[shop.id]?.length > 1 && <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-1 rounded-md border border-indigo-100">+{shopPackages[shop.id].length - 1}</span>}
                                                    <button onClick={() => setOpenShopId(openShopId === shop.id ? null : shop.id)} className="text-slate-400 hover:text-indigo-600 transition-colors bg-white border border-slate-100 p-1 rounded-lg shadow-sm">
                                                        <Settings size={13}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center bg-indigo-50/10">
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(shop.code);
                                                addToast(`Đã copy mã: ${shop.code}`, 'success');
                                            }}
                                            className="group/code inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-all shadow-lg hover:shadow-indigo-300 ring-2 ring-indigo-100 mx-auto"
                                            title="Bấm để copy mã nhanh"
                                        >
                                            <span className="text-xs font-black tracking-widest leading-none">{shop.code}</span>
                                            <Copy size={12} className="opacity-70 group-hover/code:opacity-100 transition-opacity"/>
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => togglePlan(shop)} className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all", shop.plan === 'pro' ? "bg-amber-100 border-amber-300 text-amber-900 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                            {shop.plan}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1.5">
                                            <input type="date" className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-[10px] font-black text-slate-600 outline-none focus:border-indigo-500 w-full" value={shop.plan_expiry_date?.split('T')[0] || ''} onChange={e => handleUpdateExpiry(shop.id, e.target.value)} />
                                            {!expiryDate ? (
                                                <span className="text-[10px] font-bold text-slate-500">Vô thời hạn</span>
                                            ) : isExpired ? (
                                                <span className="text-[10px] font-black text-red-500 uppercase">Đã hết hạn 🛑</span>
                                            ) : (
                                                <span className={cn("text-[10px] font-black uppercase", diffDays <= 7 ? "text-amber-500" : "text-emerald-500")}>
                                                    Còn {diffDays} ngày {diffDays <= 7 && '⚠️'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right pr-8">
                                        <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-all">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                                {openShopId === shop.id && (
                                    <tr className="bg-slate-900 text-white animate-in slide-in-from-top-2 duration-300">
                                        <td colSpan={5} className="p-4 md:p-6 pl-4 md:pl-16 border-l-4 border-indigo-600 relative">
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 xl:gap-8">
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

                                                {/* FACEBOOK CONFIG (NEW) */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-indigo-400"><MessageCircle size={12}/> Cấu hình Facebook</p>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Page ID</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Nhập ID Fanpage..."
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
                                                                defaultValue={shop.fb_page_id || ''}
                                                                id={`fbp-id-${shop.id}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Page Access Token</label>
                                                            <div className="relative">
                                                                <input 
                                                                    type={showTokens[shop.id] ? "text" : "password"} 
                                                                    placeholder="Nhập Token của Page..."
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-[10px] font-bold outline-none focus:border-indigo-500"
                                                                    defaultValue={shop.fb_page_token || ''}
                                                                    id={`fbp-token-${shop.id}`}
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setShowTokens(prev => ({ ...prev, [shop.id]: !prev[shop.id] }))}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                                                >
                                                                    {showTokens[shop.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const pageId = (document.getElementById(`fbp-id-${shop.id}`) as HTMLInputElement).value;
                                                                const token = (document.getElementById(`fbp-token-${shop.id}`) as HTMLInputElement).value;
                                                                handleUpdateFBConfig(shop.id, pageId, token);
                                                            }}
                                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-[10px] font-black uppercase transition-all"
                                                        >
                                                            Lưu Cấu Hình FB
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* MÃ MỞ KHÓA CONFIG (Dành cho shop Free) */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-rose-400">
                                                        <Lock size={12}/> Mã mở khóa Cấu hình AI
                                                        {shop.pin_hash && <span className="ml-2 bg-rose-500 text-white px-1.5 py-0.5 rounded-md text-[8px]">ĐANG KHÓA</span>}
                                                    </p>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block italic opacity-70 underline decoration-rose-500/30">Nếu để trống, Shop Free sẽ bị KHÓA vĩnh viễn cho đến khi bạn đặt mã</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Thiết lập mã tại đây để cấp cho khách..."
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-rose-500"
                                                                id={`pin-${shop.id}`}
                                                                defaultValue={shop.pin_hash || ''}
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={async () => {
                                                                const newPin = (document.getElementById(`pin-${shop.id}`) as HTMLInputElement).value;
                                                                try {
                                                                    const res = await fetch('/api/config/reset-pin', {
                                                                        method: 'POST', body: JSON.stringify({ shopId: shop.id, newPin, requesterId: currentUserId })
                                                                    });
                                                                    const verify = await res.json();
                                                                    if (verify.success) {
                                                                        addToast(newPin ? 'Đã thiết lập MÃ MỞ KHÓA thành công!' : 'Đã GỠ KHÓA cấu hình cho shop!', 'success');
                                                                        fetchShops(); // Refresh data to update badge
                                                                    }
                                                                    else addToast('Lỗi: ' + verify.error, 'error');
                                                                } catch (e) { addToast('Lỗi máy chủ', 'error'); }
                                                            }}
                                                            className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-2 text-[10px] font-black uppercase transition-all shadow-lg shadow-rose-900/20"
                                                        >
                                                            Lưu Mã Mở Khóa
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* MANYCHAT INTEGRATION (NEW) */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-blue-400"><MessageCircle size={12}/> Kết nối ManyChat</p>
                                                    <div className="space-y-4">
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="text-[8px] font-black text-slate-500 uppercase">ManyChat API Key</p>
                                                                <button 
                                                                    onClick={() => setShowManyChatKeys(prev => ({ ...prev, [shop.id]: !prev[shop.id] }))}
                                                                    className="text-[8px] text-blue-400 font-bold underline uppercase"
                                                                >
                                                                    {showManyChatKeys[shop.id] ? 'Ẩn' : 'Hiện'}
                                                                </button>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type={showManyChatKeys[shop.id] ? "text" : "password"}
                                                                    readOnly
                                                                    value={shop.manychat_api_key || 'Chưa tạo key'}
                                                                    className="flex-1 bg-transparent text-[10px] font-mono font-bold text-blue-300 outline-none"
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        if (shop.manychat_api_key) {
                                                                            navigator.clipboard.writeText(shop.manychat_api_key);
                                                                            addToast('Đã copy API Key', 'success');
                                                                        }
                                                                    }}
                                                                    className="text-slate-500 hover:text-white"
                                                                >
                                                                    <Copy size={12}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Cấu hình External Request</p>
                                                            <pre className="text-[8px] text-emerald-400 font-mono leading-tight overflow-x-auto custom-scrollbar">
{`{
  "shop_code": "${shop.code}",
  "user_id": "{{user_id}}",
  "message": "{{last_input}}"
}`}
                                                            </pre>
                                                            <button 
                                                                onClick={() => {
                                                                    const json = JSON.stringify({
                                                                        shop_code: shop.code,
                                                                        user_id: "{{user_id}}",
                                                                        message: "{{last_input}}"
                                                                    }, null, 2);
                                                                    navigator.clipboard.writeText(json);
                                                                    addToast('Đã copy JSON cấu hình', 'success');
                                                                }}
                                                                className="w-full mt-2 bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
                                                            >
                                                                Copy JSON Cấu hình
                                                            </button>
                                                        </div>

                                                        <button 
                                                            onClick={() => handleRegenerateManyChatKey(shop.id)}
                                                            className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30 rounded-xl py-2 text-[9px] font-black uppercase transition-all"
                                                        >
                                                            {shop.manychat_api_key ? 'Cấp lại API Key' : 'Tạo API Key'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* MANAGE PACKAGES */}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-emerald-400"><BrainCircuit size={12}/> Quản lý Gói Tri Thức</p>
                                                    <div className="space-y-2">
                                                        {!shopPackages[shop.id] || shopPackages[shop.id].length === 0 ? (
                                                            <p className="text-[10px] text-slate-500">Chưa nạp gói nào.</p>
                                                        ) : (
                                                            shopPackages[shop.id].map((pkg: any) => (
                                                                <div key={pkg.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2 group transition-all hover:bg-white/10">
                                                                    <span className="text-[10px] font-bold text-slate-300 truncate pr-2">{pkg.name}</span>
                                                                    <button 
                                                                        onClick={() => handleRemovePackage(shop.id, pkg.id)}
                                                                        className="text-slate-500 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                                                        title="Gỡ gói này"
                                                                    >
                                                                        <Trash2 size={12}/>
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
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
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleTestTelegram(shop.id); }} 
                                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ring-4 ring-indigo-500/10 flex items-center justify-center gap-2 mt-2"
                                                        >
                                                            <Send size={14}/> TEST TELEGRAM
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* CHAT MONITOR (NEW) */}
                                                <div className="col-span-1 md:col-span-3 border-t border-white/5 pt-8 mt-4">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><Layers size={12}/> Giám sát hội thoại (50 tin gần nhất)</p>
                                                    <ChatHistoryMonitor shopId={shop.id} />
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
              <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.5)] text-white rounded-3xl flex items-center justify-center transform transition-transform hover:scale-105 hover:-rotate-6"><BrainCircuit size={28}/></div>
                    <div>
                        <h2 className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent tracking-tight leading-none">LUYỆN TRI THỨC AI</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Natural Language Processing</p>
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
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">3. Nhập tri thức hàng loạt (Định dạng Q: và A:)</label>
                            <span className="text-[8px] font-bold text-slate-400 italic">Dán hàng trăm câu thoải mái</span>
                        </div>
                        
                        <textarea 
                            rows={15} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-medium focus:border-indigo-500 outline-none shadow-inner custom-scrollbar" 
                            placeholder="Q: Sản phẩm giá bao nhiêu?&#10;A: Dạ giá 500k ạ.&#10;&#10;Q: Có miễn phí ship không?&#10;A: Bên em freeship toàn quốc ạ.&#10;..." 
                            value={bulkRawFaq} 
                            onChange={e => setBulkRawFaq(e.target.value)}
                        ></textarea>
                        
                        <div className="mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <p className="text-[9px] text-indigo-700 font-bold leading-relaxed">
                                💡 Mẹo: Bạn chỉ cần dán nội dung có chứa các chữ Q: (Question) và A: (Answer). Hệ thống sẽ tự lọc lấy đúng các cặp tri thức để luyện.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleProcessKnowledge} 
                        disabled={isProcessing || userRole !== 'super_admin'} 
                        className={cn(
                            "w-full font-black py-4 rounded-2xl text-xs uppercase shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]",
                            userRole === 'super_admin' ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700" : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                    >
                        {userRole !== 'super_admin' ? 'BẠN KHÔNG CÓ QUYỀN LUYỆN AI' : (isProcessing ? 'Đang mã hóa tri thức hàng loạt...' : 'BẮT ĐẦU LUYỆN')}
                    </button>
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
              <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-600 shadow-[0_10px_20px_-5px_rgba(99,102,241,0.5)] text-white rounded-3xl flex items-center justify-center transform transition-transform hover:scale-105 hover:rotate-6"><Package size={28}/></div><div><h2 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent tracking-tight leading-none">KHO GÓI TRI THỨC</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Compiled Knowledge Packages</p></div></div></div>
                <div className="flex-1 overflow-y-auto max-h-[450px] space-y-3 pr-2 custom-scrollbar">
                    {knowledgePackages.map(p => (
                        <div key={p.id} className={cn("group p-4 rounded-2xl border-2 transition-all flex items-center justify-between", selectedPackageIds.includes(p.id) ? "bg-indigo-50 border-indigo-200 shadow-md" : "bg-white border-slate-50 hover:border-indigo-100 hover:shadow-sm")}>
                            <div className="flex items-center gap-3 flex-1" onClick={() => { if(selectedPackageIds.includes(p.id)) setSelectedPackageIds(selectedPackageIds.filter(id => id !== p.id)); else setSelectedPackageIds([...selectedPackageIds, p.id]); }}>
                                {selectedPackageIds.includes(p.id) ? <CheckSquare size={20} className="text-indigo-600 shrink-0"/> : <Square size={20} className="text-slate-200 group-hover:text-indigo-200 shrink-0"/>}
                                <div className="min-w-0"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{p.industry_name}</p><p className="text-xs font-black text-slate-800 truncate">{p.package_name}</p></div>
                            </div>
                            <button onClick={() => setEditingPackage(p)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">🎯 Nạp cho mã shop (Space-separated)</label>
                            <input type="text" className="w-full bg-slate-900 text-white rounded-2xl p-4 text-lg font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-100 outline-none" placeholder="70WPN 88ABC..." value={targetCodes} onChange={e => setTargetCodes(e.target.value)} />
                        </div>
                        <button 
                            onClick={handlePushMultiKnowledge} 
                            disabled={pushingKnowledge || selectedPackageIds.length === 0 || userRole !== 'super_admin'} 
                            className={cn(
                                "w-full font-black py-5 rounded-[2rem] text-sm uppercase shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98]",
                                userRole === 'super_admin' ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Send size={24} className={pushingKnowledge ? "animate-ping" : ""}/>
                            {userRole !== 'super_admin' ? 'BẠN KHÔNG CÓ QUYỀN XUẤT XƯỞNG' : (pushingKnowledge ? 'ĐANG XUẤT XƯỞNG...' : 'XUẤT XƯỞNG TRI THỨC')}
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'keywords' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20 px-2 lg:px-0">
              <KeywordManagement />
           </div>
        )}

        {/* MODAL EDIT PACKAGE */}
        {editingPackage && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setEditingPackage(null)} className="absolute top-8 right-8 text-slate-500 hover:text-slate-900"><Trash2 size={24}/></button>
                    <div className="flex items-center gap-4 mb-10"><div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl"><Edit2 size={28}/></div><div><h2 className="text-2xl font-black text-slate-900">CHỈNH SỬA GÓI TRI THỨC</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Cấu hình nội dung đã đóng gói</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10"><div className="space-y-6"><div><label className="text-[10px] font-black uppercase text-indigo-500 mb-2 block">Tên Gói</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold" value={editingPackage.package_name} onChange={e => setEditingPackage({...editingPackage, package_name: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase text-indigo-500 mb-2 block">1. Mô tả sản phẩm</label><textarea rows={8} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold leading-relaxed" value={editingPackage.product_info} onChange={e => setEditingPackage({...editingPackage, product_info: e.target.value})}></textarea></div></div><div className="space-y-6"><div><label className="text-[10px] font-black uppercase text-emerald-500 mb-2 block">2. Câu hỏi thường gặp (FAQ)</label><textarea rows={12} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold leading-relaxed" value={editingPackage.faq} onChange={e => setEditingPackage({...editingPackage, faq: e.target.value})}></textarea></div></div></div>
                    <button onClick={handleUpdatePackage} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all text-sm uppercase">CẬP NHẬT GÓI DỮ LIỆU</button>
                    <button onClick={() => { if(confirm('Xóa gói?')) supabase.from('knowledge_templates').delete().eq('id', editingPackage.id).then(() => { fetchKnowledgePackages(); setEditingPackage(null); }) }} className="mt-4 w-full text-red-400 text-[10px] font-black uppercase tracking-widest hover:text-red-600">Xóa vĩnh viễn gói này</button>
                </div>
            </div>
        )}

      {/* SUB-COMPONENTS FROM EXTERNAL FILE */}
      {activeTab === 'apikeys' && (
        <div className="px-2 lg:px-0">
          <ApiKeysView 
            showKeys={showKeys} setShowKeys={setShowKeys} 
            apiKey1={apiKey1} setApiKey1={setApiKey1} 
            apiKey2={apiKey2} setApiKey2={setApiKey2} 
            apiKeyPro={apiKeyPro} setApiKeyPro={setApiKeyPro} 
            deepSeekKeyFree1={deepSeekKeyFree1} setDeepSeekKeyFree1={setDeepSeekKeyFree1}
            deepSeekKeyFree2={deepSeekKeyFree2} setDeepSeekKeyFree2={setDeepSeekKeyFree2}
            deepSeekKeyPro={deepSeekKeyPro} setDeepSeekKeyPro={setDeepSeekKeyPro}
            fbVerifyToken={fbVerifyToken} setFbVerifyToken={setFbVerifyToken}
            fbAppSecret={fbAppSecret} setFbAppSecret={setFbAppSecret}
            systemTelegramToken={systemTelegramToken} setSystemTelegramToken={setSystemTelegramToken}
            systemStats={systemStats} onSave={() => handleSaveSystemSettings('api')}
            addToast={addToast}
          />
        </div>
      )}
      {activeTab === 'errors' && <div className="px-2 lg:px-0"><LogsView errorLogs={errorLogs} /></div>}
      {activeTab === 'analytics' && (
        <div className="px-2 lg:px-0">
          <AiAnalytics />
        </div>
      )}
      {activeTab === 'telegram' && (
        <div className="px-2 lg:px-0">
          <TelegramMonitor />
        </div>
      )}
      {activeTab === 'facebook' && (
        <div className="px-2 lg:px-0 space-y-8 pb-20">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white shadow-2xl shadow-blue-100/50">
             <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(59,130,246,0.5)] transform transition-transform hover:scale-105">
                   <MessageCircle size={32} />
                </div>
                <div>
                   <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent uppercase tracking-tight leading-none">Kênh Facebook Messenger</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Cấu hình Webhook & Bảo mật hệ thống FB Toàn Cục</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* THÔNG TIN WEBHOOK */}
                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Webhook URL (Dán vào Facebook Developers)</p>
                      <div className="flex gap-2">
                         <input 
                            readOnly 
                            value="https://app.dichvupro.net/api/facebook/webhook" 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-indigo-600"
                         />
                         <button 
                            onClick={() => {
                                navigator.clipboard.writeText("https://app.dichvupro.net/api/facebook/webhook");
                                addToast('Đã copy Webhook URL', 'success');
                            }}
                            className="p-2 bg-indigo-600 text-white rounded-xl"
                         >
                            <Copy size={16}/>
                         </button>
                      </div>
                   </div>

                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verify Token (Sử dụng để xác thực Webhook)</p>
                      <div className="flex gap-2">
                         <input 
                            readOnly 
                            value={fbVerifyToken || 'Đang tải...'} 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-emerald-600"
                         />
                         <button 
                            onClick={() => {
                                navigator.clipboard.writeText(fbVerifyToken);
                                addToast('Đã copy Verify Token', 'success');
                            }}
                            className="p-2 bg-emerald-600 text-white rounded-xl"
                         >
                            <Copy size={16}/>
                         </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 italic">Lưu ý: Bạn có thể thay đổi Token này tại tab "Cấu hình API"</p>
                   </div>
                </div>

                {/* HƯỚNG DẪN BỌC THÉP */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                   <div className="absolute -right-10 -bottom-10 opacity-10">
                      <Lock size={200}/>
                   </div>
                   <div className="relative z-10">
                      <h3 className="text-lg font-black text-indigo-400 mb-4 flex items-center gap-2 underline">
                         <ShieldAlert size={20}/> TRẠNG THÁI BẢO MẬT
                      </h3>
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full", fbAppSecret ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]")}></div>
                            <p className="text-xs font-bold uppercase tracking-tight">
                               FB APP SECRET: {fbAppSecret ? "ĐÃ CẤU HÌNH (SAFE)" : "CHƯA CẤU HÌNH (UNSAFE)"}
                            </p>
                         </div>
                         <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[11px] leading-relaxed text-slate-500">
                               Hệ thống hiện đang sử dụng cơ chế <span className="text-white font-bold">X-Hub-Signature-256</span> để xác thực tin nhắn. 
                               Yêu cầu phải có App Secret để bot có thể trả lời khách hàng.
                            </p>
                         </div>
                         {!fbAppSecret && (
                            <button 
                               onClick={() => setActiveTab('apikeys')}
                               className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                               Click để đi cấu hình ngay
                            </button>
                         )}
                      </div>
                   </div>
                </div>
             </div>

             {/* FB ERROR LOGS SPECIFIC SECTION */}
             <div className="mt-10">
                 <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> Lỗi Facebook Webhook Gần Đây</h3>
                 <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-inner">
                    {errorLogs.filter((l: any) => l.file_source === 'fb_webhook' || l.error_type?.includes('FB_WEBHOOK')).length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-bold uppercase italic text-center py-8">Chưa có lỗi Facebook nào được ghi nhận gần đây.</p>
                    ) : (
                        <div className="space-y-3">
                            {errorLogs.filter((l: any) => l.file_source === 'fb_webhook' || l.error_type?.includes('FB_WEBHOOK')).map((l: any) => (
                                <div key={l.id} className="bg-white p-4 rounded-xl border border-red-100 flex flex-col md:flex-row justify-between gap-4 hover:border-red-300 transition-all shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 uppercase tracking-widest">{l.error_type}</span>
                                            {l.shops && <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest">#{l.shops.code || 'UNKNOWN'}</span>}
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">{l.error_message}</p>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 whitespace-nowrap bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 h-fit">
                                        {new Date(l.created_at).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             </div>
          </div>
        </div>
      )}
      {activeTab === 'config' && (
        <div className="px-2 lg:px-0">
          <SettingsView trialTemplateCode={trialTemplateCode} setTrialTemplateCode={setTrialTemplateCode} onSave={() => handleSaveSystemSettings('config')} />
        </div>
      )}

      {/* TOAST NOTIFICATIONS (PC/IPAD/MOBILE RESPONSIVE) */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999] flex flex-col gap-3 w-full max-w-[90%] md:max-w-xs pointer-events-none items-end">
          {toasts.map((t: any) => (
            <div key={t.id} className={cn(
                "animate-in slide-in-from-right-10 duration-300 pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border-l-[6px] w-[90vw] md:w-[320px]",
                t.type === 'error' ? "bg-white border-red-500 text-red-600" : 
                t.type === 'success' ? "bg-white border-emerald-500 text-emerald-600" : 
                "bg-white border-indigo-500 text-indigo-600"
            )}>
              <div className={cn("p-1.5 rounded-lg shrink-0", t.type === 'error' ? "bg-red-50" : t.type === 'success' ? "bg-emerald-50" : "bg-indigo-50")}>
                {t.type === 'error' ? <AlertTriangle size={18}/> : t.type === 'success' ? <CheckCircle size={18}/> : <Layers size={18}/>}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[11px] md:text-xs font-black uppercase leading-relaxed break-words">
                    {t.msg}
                </p>
              </div>
            </div>
          ))}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
      `}</style>
      </div>
    </div>
  );
}
