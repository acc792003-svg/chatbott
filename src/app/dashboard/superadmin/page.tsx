'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shop } from '@/types';
import { ShieldAlert, Plus, Trash2, Edit, Save, X, CalendarClock, Key, AlertTriangle, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopUsers, setShopUsers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  
  // Create / Edit states
  const [editingShop, setEditingShop] = useState<string | null>(null);
  const [editDays, setEditDays] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  
  // User Manager Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [updatingUser, setUpdatingUser] = useState(false);

  // API Key Management
  const [apiKey1, setApiKey1] = useState('');
  const [apiKey2, setApiKey2] = useState('');
  const [apiKeyPro, setApiKeyPro] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);

  // Error Logs
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'shops' | 'apikeys' | 'errors' | 'config'>('shops');

  // Trial Template Configuration
  const [trialTemplateCode, setTrialTemplateCode] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    setCurrentUserId(session.user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userData?.role === 'super_admin') {
      setIsSuperAdmin(true);
      fetchShops();
      fetchApiKeys();
      fetchErrorLogs();
    } else {
      setLoading(false);
    }
  };

  // ==================== FETCH DATA ====================
  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (data) setShops(data as Shop[]);

    const { data: usersData } = await supabase.from('users').select('id, shop_id, email, role');
    if (usersData) {
       const userMap: Record<string, any[]> = {};
       usersData.forEach((u: any) => {
          if (u.shop_id) {
             if (!userMap[u.shop_id]) userMap[u.shop_id] = [];
             userMap[u.shop_id].push(u);
          }
       });
       setShopUsers(userMap);
    }

    setLoading(false);
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setApiKey1(data.settings.gemini_api_key_1 || '');
        setApiKey2(data.settings.gemini_api_key_2 || '');
        setApiKeyPro(data.settings.gemini_api_key_pro || '');
        setTrialTemplateCode(data.settings.trial_template_shop_code || '70WPN');
      }
    } catch (e) {}
  };

  const fetchErrorLogs = async () => {
    try {
      const res = await fetch('/api/admin/errors');
      const data = await res.json();
      if (data.errors) setErrorLogs(data.errors);
    } catch (e) {}
  };

  // ==================== SHOP MANAGEMENT ====================
  const generateShopCode = () => {
    const nums = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const n1 = nums[Math.floor(Math.random() * nums.length)];
    const n2 = nums[Math.floor(Math.random() * nums.length)];
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    return `${n1}${n2}${l1}${l2}${l3}`;
  };

  const handleCreateShop = async () => {
    const newCode = generateShopCode();
    const shopName = `Cửa hàng Mới - ${newCode}`;
    const defaultDays = 30;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + defaultDays);

    const { error } = await supabase.from('shops').insert([{
      name: shopName,
      code: newCode,
      subscription_days: defaultDays,
      expiry_date: expiryDate.toISOString()
    }]).select();

    if (error) {
      alert('Lỗi tạo mã cửa hàng: ' + error.message);
    } else {
      alert(`Đã tạo thành công mã: ${newCode}`);
      fetchShops();
    }
  };

  const handleDeleteShop = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn cửa hàng này?')) return;
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) alert('Lỗi xóa: ' + error.message);
    else fetchShops();
  };

  const handleStartEdit = (shop: Shop) => {
    setEditingShop(shop.id);
    setEditDays(shop.subscription_days || 0);
    setEditPhone(shop.phone_number || '');
    setEditSlug(shop.slug || '');
    setEditGender(shop.bot_gender || 'male');
  };

  const handleSaveEdit = async (shop: Shop) => {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + editDays);

    const { error } = await supabase.from('shops').update({
      subscription_days: editDays,
      phone_number: editPhone,
      slug: editSlug.toLowerCase().trim() || null,
      bot_gender: editGender,
      expiry_date: newExpiry.toISOString()
    }).eq('id', shop.id);

    if (error) {
      alert('Lỗi cập nhật: ' + error.message);
    } else {
      setEditingShop(null);
      fetchShops();
    }
  };

  // ==================== USER MANAGEMENT ====================
  const openUserModal = async (u: any, shopName: string) => {
    setSelectedUser({ ...u, shopName });
    setNewPassword('');
    setUserModalOpen(true);
    setUserMessages([]); // Reset trước
    
    // Lấy lịch sử chat qua API (dùng supabaseAdmin phía server để bypass RLS)
    try {
      const res = await fetch(`/api/admin/messages?shop_id=${u.shop_id}`);
      const data = await res.json();
      if (data.messages) setUserMessages(data.messages);
    } catch (e) {
      console.error('Lỗi lấy lịch sử chat:', e);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert('Vui lòng nhập mật khẩu mới!');
    setUpdatingUser(true);
    try {
       const res = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             userId: selectedUser.id,
             password: newPassword,
             requesterId: currentUserId
          })
       });
       const result = await res.json();
       if (result.error) throw new Error(result.error);
       alert('Đổi mật khẩu tài khoản thành công!');
       setNewPassword('');
    } catch (e: any) {
       alert('Lỗi đổi mật khẩu: ' + e.message);
    } finally {
       setUpdatingUser(false);
    }
  };

  const handleChangeRole = async (newRole: string) => {
    setUpdatingUser(true);
    try {
       const res = await fetch('/api/admin/update-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             userId: selectedUser.id,
             role: newRole,
             requesterId: currentUserId
          })
       });
       const result = await res.json();
       if (result.error) throw new Error(result.error);
       
       setSelectedUser({ ...selectedUser, role: newRole });
       alert('Đã cập nhật quyền hạn thành công!');
       fetchShops(); // Refresh list to show new role
    } catch (e: any) {
       alert('Lỗi cập nhật quyền: ' + e.message);
    } finally {
       setUpdatingUser(false);
    }
  };

  // ==================== API KEYS ====================
  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    try {
      // Lưu key 1
      const res1 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gemini_api_key_1', value: apiKey1, requesterId: currentUserId })
      });
      const r1 = await res1.json();
      if (r1.error) throw new Error(r1.error);

      // Lưu key 2
      const res2 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gemini_api_key_2', value: apiKey2, requesterId: currentUserId })
      });
      const r2 = await res2.json();
      if (r2.error) throw new Error(r2.error);

      // Lưu key Pro
      const resPro = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gemini_api_key_pro', value: apiKeyPro, requesterId: currentUserId })
      });
      const rPro = await resPro.json();
      if (rPro.error) throw new Error(rPro.error);

      alert('Đã lưu tất cả API Keys thành công!');
    } catch (e: any) {
      alert('Lỗi lưu: ' + e.message);
    } finally {
      setSavingKeys(false);
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
      alert('Đã cập nhập mã Shop mẫu dùng thử thành công!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUpgradePro = async (shopId: string) => {
    const days = prompt('Nhập số ngày muốn nâng cấp Pro:', '30');
    if (!days) return;

    try {
      const res = await fetch('/api/admin/upgrade-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, days, requesterId: currentUserId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Nâng cấp PRO thành công!');
      fetchShops();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleDowngradeFree = async (shopId: string) => {
    if (!confirm('Bạn có chắc muốn hạ cấp shop này xuống gói FREE?')) return;

    try {
      const res = await fetch('/api/admin/upgrade-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, requesterId: currentUserId, action: 'downgrade' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Đã hạ cấp xuống FREE thành công!');
      fetchShops();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  // ==================== RENDER ====================
  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 glass rounded-2xl">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-slate-800">Từ Chối Truy Cập</h1>
        <p className="text-slate-500 mt-2">Chỉ có Super Admin mới có quyền truy cập khu vực này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-red-100 text-red-600 p-2 rounded-xl"><ShieldAlert size={24} /></span>
            Bảng Điều Khiển Super Admin
          </h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý cửa hàng, API Keys, và giám sát hệ thống.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button onClick={() => setActiveTab('shops')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'shops' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          🏪 Quản lý Cửa hàng
        </button>
        <button onClick={() => setActiveTab('apikeys')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'apikeys' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          🔑 API Keys
        </button>
        <button onClick={() => { setActiveTab('errors'); fetchErrorLogs(); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'errors' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          ⚠️ Nhật ký Lỗi {errorLogs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{errorLogs.length}</span>}
        </button>
        <button onClick={() => setActiveTab('config')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
          ⚙️ Cấu hình
        </button>
      </div>

      {/* ==================== TAB: SHOPS ==================== */}
      {activeTab === 'shops' && (
        <>
          <div className="flex justify-end">
            <button onClick={handleCreateShop} className="btn-gradient px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg">
              <Plus size={18} /> <span>TẠO MÃ CỬA HÀNG MỚI</span>
            </button>
          </div>

          <div className="glass rounded-[2.5rem] overflow-hidden shadow-xl border-white/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Cửa Hàng / Mã (Code)</th>
                    <th className="px-8 py-5">Số Điện Thoại</th>
                    <th className="px-8 py-5">Deeplink (Slug)</th>
                    <th className="px-8 py-5 text-center">Icon Gái/Trai</th>
                    <th className="px-8 py-5">Ngày Tạo</th>
                    <th className="px-8 py-5">Gói Dịch Vụ</th>
                    <th className="px-8 py-5 text-center">Thời Hạn (Ngày)</th>
                    <th className="px-8 py-5">Hết Hạn</th>
                    <th className="px-8 py-5 text-right">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-white/40 transition-colors">
                      <td className="px-8 py-4">
                        <div className="font-bold text-sm text-slate-900">{shop.name}</div>
                        <div className="text-xs font-black text-indigo-600 tracking-widest mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md">
                          MÃ: {shop.code || 'CHƯA CÓ'}
                        </div>
                        {shopUsers[shop.id] && shopUsers[shop.id].length > 0 && (
                          <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="font-bold block mb-1">Tài khoản quản lý:</span>
                            {shopUsers[shop.id].map(u => (
                              <div key={u.id} className="flex gap-2 items-center justify-between mb-1">
                                 <div className="flex items-center gap-1.5">
                                   <span>• {u.email || 'Ẩn danh'}</span>
                                   <span className="text-orange-500 font-bold uppercase text-[9px] px-1 bg-orange-100 rounded">{u.role}</span>
                                 </div>
                                 <button onClick={() => openUserModal(u, shop.name)} className="text-blue-600 font-bold bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-all">Quản lý & Chat</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-4">
                        {editingShop === shop.id ? (
                          <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Nhập SĐT..." className="w-32 border-2 border-blue-400 rounded-lg p-1 text-sm font-bold outline-none" />
                        ) : (
                          <span className="text-sm font-bold text-slate-700">
                            {shop.phone_number || <span className="text-slate-400 italic">Chưa nhập</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-4">
                        {editingShop === shop.id ? (
                          <div className="flex flex-col gap-1">
                            <input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="VD: qlady" className="w-32 border-2 border-indigo-400 rounded-lg p-1 text-sm font-bold outline-none" />
                            <span className="text-[10px] text-slate-400">Không dấu, không cách</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-indigo-600">
                              {shop.slug ? `/${shop.slug}` : <span className="text-slate-300 font-normal italic">Chưa thiết lập</span>}
                            </span>
                            {shop.slug && (
                              <button 
                                onClick={() => {
                                  const url = `${window.location.origin}/s/${shop.slug}`;
                                  navigator.clipboard.writeText(url);
                                  alert('Đã copy: ' + url);
                                }}
                                className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 w-fit hover:bg-indigo-100"
                              >
                                Copy Link
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-4 text-center">
                        {editingShop === shop.id ? (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setEditGender('male')} className={`p-1 rounded-md border-2 transition-all ${editGender === 'male' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`} title="Nam">🤖♂️</button>
                            <button onClick={() => setEditGender('female')} className={`p-1 rounded-md border-2 transition-all ${editGender === 'female' ? 'border-pink-500 bg-pink-50' : 'border-transparent'}`} title="Nữ">🤖♀️</button>
                          </div>
                        ) : (
                          <span className="text-xl">
                            {shop.bot_gender === 'female' ? '🤖♀️' : '🤖♂️'}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md w-fit uppercase ${shop.plan === 'pro' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                            {shop.plan === 'pro' ? '🌟 PRO' : 'FREE'}
                          </span>
                          {shop.plan === 'pro' && shop.plan_expiry_date && (
                             <span className="text-[9px] text-amber-600 font-bold">
                               Hết hạn: {new Date(shop.plan_expiry_date).toLocaleDateString('vi-VN')}
                             </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        {editingShop === shop.id ? (
                          <input type="number" value={editDays} onChange={e => setEditDays(Number(e.target.value))} className="w-20 text-center border-2 border-blue-400 rounded-lg p-1 text-sm font-bold outline-none" />
                        ) : (
                          <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            {shop.subscription_days || 0} ngày
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-4">
                        {shop.expiry_date ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <CalendarClock size={14} className={new Date(shop.expiry_date) < new Date() ? 'text-red-500' : 'text-green-500'} />
                            <span className={new Date(shop.expiry_date) < new Date() ? 'text-red-500' : 'text-green-600'}>
                              {new Date(shop.expiry_date).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Vĩnh viễn</span>
                        )}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {shop.plan !== 'pro' ? (
                            <button onClick={() => handleUpgradePro(shop.id)} className="p-2 text-amber-600 hover:bg-amber-50 transition-colors bg-white rounded-lg border border-amber-200 shadow-sm" title="Nâng cấp PRO"><Key size={16}/></button>
                          ) : (
                            <button onClick={() => handleDowngradeFree(shop.id)} className="p-2 text-slate-400 hover:bg-slate-50 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm" title="Hủy PRO"><Key size={16} className="rotate-180 opacity-50"/></button>
                          )}
                          {editingShop === shop.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(shop)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Save size={16} /></button>
                              <button onClick={() => setEditingShop(null)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleStartEdit(shop)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg border shadow-sm"><Edit size={16} /></button>
                              <button onClick={() => handleDeleteShop(shop.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white rounded-lg border shadow-sm"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shops.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-10 text-center text-slate-400 text-sm font-medium">
                        Chưa có cửa hàng nào trên hệ thống.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== TAB: API KEYS ==================== */}
      {activeTab === 'apikeys' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-2xl"><Key size={24} className="text-amber-600" /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Quản lý API Key Gemini</h2>
              <p className="text-sm text-slate-500 font-medium">2 API Key luân phiên, tự động chuyển đổi khi 1 key bị quá tải.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">🔑 API Key 1 (Chính)</label>
              <input 
                type="text" 
                value={apiKey1} 
                onChange={e => setApiKey1(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">🔑 API Key 2 (Dự phòng)</label>
              <input 
                type="text" 
                value={apiKey2} 
                onChange={e => setApiKey2(e.target.value)}
                placeholder="AIzaSy... (không bắt buộc)"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-mono text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="border-t pt-5 mt-5">
              <label className="block text-xs font-bold uppercase text-amber-600 mb-2 font-black flex items-center gap-2">
                🌟 API Key Trả Phí (Dành cho gói Pro)
              </label>
              <input 
                type="text" 
                value={apiKeyPro} 
                onChange={e => setApiKeyPro(e.target.value)}
                placeholder="Nhập khóa xịn cho khách trả phí..."
                className="w-full bg-amber-50/50 border-2 border-amber-200 rounded-xl p-4 font-mono text-sm focus:border-amber-500 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 font-medium leading-relaxed">
              <strong>💡 Lưu ý:</strong> API Key được lưu trong database và ưu tiên sử dụng trước API Key trong file .env.local. 
              Nếu bạn cung cấp 2 key, hệ thống sẽ tự động chuyển sang key 2 khi key 1 bị quá tải.
            </div>

            <button 
              onClick={handleSaveApiKeys}
              disabled={savingKeys}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {savingKeys ? 'Đang lưu...' : 'LƯU API KEYS'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB: ERROR LOGS ==================== */}
      {activeTab === 'errors' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-2xl"><AlertTriangle size={24} className="text-red-600" /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Nhật ký Lỗi Hệ thống</h2>
                <p className="text-sm text-slate-500 font-medium">50 lỗi gần nhất được ghi nhận từ Chatbot AI.</p>
              </div>
            </div>
            <button onClick={fetchErrorLogs} className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">🔄 Làm mới</button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {errorLogs.length > 0 ? errorLogs.map(log => (
              <div key={log.id} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md uppercase">{log.error_type}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{log.source}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <p className="text-sm text-slate-700 mt-2 font-medium">{log.error_message}</p>
              </div>
            )) : (
              <div className="text-center py-16 text-slate-400 font-bold">
                ✅ Chưa có lỗi nào được ghi nhận. Hệ thống hoạt động tốt!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: CONFIG ==================== */}
      {activeTab === 'config' && (
        <div className="glass rounded-[2.5rem] p-8 shadow-xl max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 rounded-2xl">⚙️</div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Cấu hình Hệ thống</h2>
              <p className="text-sm text-slate-500 font-medium">Thiết lập các thông số vận hành mặc định.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">🏪 Mã Shop Mẫu (Dùng thử)</label>
              <input 
                type="text" 
                value={trialTemplateCode} 
                onChange={e => setTrialTemplateCode(e.target.value.toUpperCase())}
                placeholder="VD: 70WPN"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700 font-medium leading-relaxed">
              <strong>💡 Giải thích:</strong> Đây là mã Shop mà hệ thống sẽ lấy dữ liệu "Cấu hình Chatbot" để nhân bản (copy) 
              sang cho những người dùng mới bấm vào nút <strong>Dùng thử miễn phí</strong>.
            </div>

            <button 
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {savingConfig ? 'Đang lưu...' : 'LƯU CẤU HÌNH'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== USER MODAL ==================== */}
      {userModalOpen && selectedUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Quản lý User: {selectedUser.email}</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Cửa hàng: <span className="text-blue-600 font-bold">{selectedUser.shopName}</span></p>
                  </div>
                  <button onClick={() => setUserModalOpen(false)} className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                  {/* Cột trái: Đổi mật khẩu */}
                  <div className="w-full md:w-1/3 space-y-4">
                     <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Edit size={16} className="text-blue-600"/> Cấp lại mật khẩu</h3>
                        <p className="text-xs text-slate-500 mb-4">Thiết lập mật khẩu mới cho tài khoản này.</p>
                        <input 
                           type="text" 
                           placeholder="Nhập mật khẩu mới..."
                           value={newPassword}
                           onChange={e => setNewPassword(e.target.value)}
                           className="w-full mb-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:border-blue-500 outline-none"
                        />
                        <button 
                           onClick={handleChangePassword}
                           disabled={updatingUser || !newPassword}
                           className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                           {updatingUser ? 'Đang đổi...' : 'ÁP DỤNG MẬT KHẨU'}
                        </button>
                     </div>

                     <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">🛡️ Quyền Hạn</h3>
                        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                          <strong>Admin:</strong> Chủ cửa hàng, toàn quyền cài đặt.<br/>
                          <strong>User:</strong> Nhân viên, chỉ xem và chat demo.
                        </p>
                        <div className="flex gap-2">
                           <button 
                              onClick={() => handleChangeRole('admin')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedUser.role === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-slate-400'}`}
                           >
                              ADMIN
                           </button>
                           <button 
                              onClick={() => handleChangeRole('user')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedUser.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-slate-400'}`}
                           >
                              USER
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Cột phải: Lịch sử chat */}
                  <div className="w-full md:w-2/3 border border-slate-100 rounded-2xl p-5 flex flex-col max-h-[60vh]">
                     <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={16} className="text-emerald-600" />
                        Lịch sử Chat gần nhất (Giám sát)
                     </h3>
                     <div className="flex-1 overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {userMessages.length > 0 ? userMessages.map((msg: any) => (
                           <div key={msg.id} className="text-sm bg-white p-3 border border-slate-100 rounded-xl shadow-sm text-slate-600">
                              <p className="text-[10px] text-slate-400 font-bold mb-1">{new Date(msg.created_at).toLocaleString('vi-VN')}</p>
                              <div className="flex flex-col gap-1.5">
                                 <p><span className="font-black text-indigo-600">Khách:</span> <span className="font-medium text-slate-800">{msg.user_message}</span></p>
                                 <p className="mt-1 pt-1 border-t border-slate-100"><span className="font-black text-emerald-600">AI:</span> {msg.ai_response}</p>
                              </div>
                           </div>
                        )) : (
                           <div className="text-center text-slate-400 py-10 font-bold text-sm">Chưa có dữ liệu chat nào từ cửa hàng này.</div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
