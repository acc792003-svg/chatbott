'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shop } from '@/types';
import { ShieldAlert, Plus, Trash2, Edit, Save, X, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopUsers, setShopUsers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Create / Edit states
  const [editingShop, setEditingShop] = useState<string | null>(null);
  const [editDays, setEditDays] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  
  // User Manager Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [updatingUser, setUpdatingUser] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userData?.role === 'super_admin') {
      setIsSuperAdmin(true);
      fetchShops();
    } else {
      setLoading(false);
    }
  };

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

  const generateShopCode = () => {
    const nums = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // 2 numbers
    const n1 = nums[Math.floor(Math.random() * nums.length)];
    const n2 = nums[Math.floor(Math.random() * nums.length)];
    // 3 letters
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    return `${n1}${n2}${l1}${l2}${l3}`; // Ví dụ: 89ABC
  };

  const handleCreateShop = async () => {
    const newCode = generateShopCode();
    const shopName = `Cửa hàng Mới - ${newCode}`;
    const defaultDays = 30; // Mặc định cấp 30 ngày dùng thử
    
    // expiry_date = now() + 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + defaultDays);

    const { data, error } = await supabase.from('shops').insert([{
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
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn cửa hàng này và toàn bộ dữ liệu của nó?')) return;
    
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) alert('Lỗi xóa: ' + error.message);
    else fetchShops();
  };

  const handleStartEdit = (shop: Shop) => {
    setEditingShop(shop.id);
    setEditDays(shop.subscription_days || 0);
    setEditPhone(shop.phone_number || '');
  };

  const handleSaveEdit = async (shop: Shop) => {
    // Tính lại ngày hết hạn dựa trên số ngày mới so với ngày tạo hoặc ngày hiện tại tùy logic.
    // Ở đây đơn giản lấy ngày hiện tại cộng với số ngày cập nhật.
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + editDays);

    const { error } = await supabase.from('shops').update({
      subscription_days: editDays,
      phone_number: editPhone,
      expiry_date: newExpiry.toISOString()
    }).eq('id', shop.id);

    if (error) {
      alert('Lỗi cập nhật: ' + error.message);
    } else {
      setEditingShop(null);
      fetchShops();
    }
  };

  const openUserModal = async (u: any, shopName: string) => {
    setSelectedUser({ ...u, shopName });
    setNewPassword('');
    setUserModalOpen(true);
    
    // Thu thập lịch sử chat (do bảng messages lưu theo shop_id)
    const { data } = await supabase.from('messages')
      .select('*')
      .eq('shop_id', u.shop_id)
      .order('created_at', { ascending: false })
      .limit(50); // Lấy 50 tin nhắn gần nhất
      
    setUserMessages(data || []);
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert('Vui lòng nhập mật khẩu mới!');
    setUpdatingUser(true);
    try {
       const { data: { session } } = await supabase.auth.getSession();
       const res = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             userId: selectedUser.id,
             password: newPassword,
             requesterId: session?.user?.id
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-red-100 text-red-600 p-2 rounded-xl"><ShieldAlert size={24} /></span>
            Bảng Điều Khiển Super Admin
          </h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý mã cửa hàng, hệ thống đại lý và gia hạn.</p>
        </div>
        <button 
          onClick={handleCreateShop}
          className="btn-gradient px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          <span>TẠO MÃ CỬA HÀNG MỚI</span>
        </button>
      </div>

      <div className="glass rounded-[2.5rem] overflow-hidden shadow-xl border-white/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Cửa Hàng / Mã (Code)</th>
                <th className="px-8 py-5">Số Điện Thoại</th>
                <th className="px-8 py-5">Ngày Tạo</th>
                <th className="px-8 py-5 text-center">Thời Hạn (Ngày)</th>
                <th className="px-8 py-5">Ngày Hết Hạn</th>
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
                             <button onClick={() => openUserModal(u, shop.name)} className="text-blue-600 font-bold bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-all">Quản lý User & Xem Chat</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-4">
                    {editingShop === shop.id ? (
                      <input 
                        type="text" 
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="Nhập SĐT..."
                        className="w-32 border-2 border-blue-400 rounded-lg p-1 text-sm font-bold outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-700">
                        {shop.phone_number || <span className="text-slate-400 italic">Chưa nhập</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-semibold text-slate-500">
                      {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    {editingShop === shop.id ? (
                      <input 
                        type="number" 
                        value={editDays}
                        onChange={e => setEditDays(Number(e.target.value))}
                        className="w-20 text-center border-2 border-blue-400 rounded-lg p-1 text-sm font-bold outline-none"
                      />
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
                    {editingShop === shop.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleSaveEdit(shop)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Save size={16} /></button>
                        <button onClick={() => setEditingShop(null)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleStartEdit(shop)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg border shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteShop(shop.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white rounded-lg border shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    )}
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

      {/* Thông tin User Modal */}
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
                        <p className="text-xs text-slate-500 mb-4">Bạn có thể thiết lập mật khẩu mới cho tài khoản khách hàng này.</p>
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
                  </div>

                  {/* Cột phải: Lịch sử chat cửa hàng */}
                  <div className="w-full md:w-2/3 border border-slate-100 rounded-2xl p-5 flex flex-col max-h-[60vh]">
                     <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                        Lịch sử Chat gần nhất của User/Shop (Giám sát)
                     </h3>
                     <div className="flex-1 overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {userMessages.length > 0 ? userMessages.map(msg => (
                           <div key={msg.id} className="text-sm bg-white p-3 border border-slate-100 rounded-xl shadow-sm text-slate-600 animate-in fade-in slide-in-from-bottom-2">
                              <p className="text-[10px] text-slate-400 font-bold mb-1">{new Date(msg.created_at).toLocaleString('vi-VN')}</p>
                              <div className="flex flex-col gap-1.5">
                                 <p><span className="font-black text-indigo-600">Khách:</span> <span className="font-medium text-slate-800">{msg.user_message}</span></p>
                                 <p className="mt-1 pt-1 border-t border-slate-100"><span className="font-black text-emerald-600">AI:</span> {msg.bot_response}</p>
                              </div>
                           </div>
                        )) : (
                           <div className="text-center text-slate-400 py-10 font-bold text-sm">Chưa có dữ liệu chat nào ghi nhận được từ cửa hàng này.</div>
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
