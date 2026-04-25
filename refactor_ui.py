import codecs
file_path = r'C:\A\CHATBOT\src\app\dashboard\superadmin\page.tsx'

with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

start_marker = '{openShopId === shop.id && ('
end_marker = '{/* ========================================================================= */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Failed to find markers')
    exit(1)

new_block = """{openShopId === shop.id && (
                                    <tr className="bg-slate-900 text-white animate-in slide-in-from-top-2 duration-300">
                                        <td colSpan={5} className="p-0 border-l-4 border-indigo-600 relative">
                                            {/* Sub-Tabs Header */}
                                            <div className="flex border-b border-slate-700/50 bg-slate-800/50 px-4 md:px-16 pt-4 gap-6 overflow-x-auto custom-scrollbar">
                                                <button onClick={() => setActiveShopTab('core')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeShopTab === 'core' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                                    <Brain size={14} className="inline mr-1 mb-0.5"/> Nền Tảng AI
                                                </button>
                                                <button onClick={() => setActiveShopTab('channels')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeShopTab === 'channels' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                                    <MessageCircle size={14} className="inline mr-1 mb-0.5"/> Đa Kênh
                                                </button>
                                                <button onClick={() => setActiveShopTab('settings')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeShopTab === 'settings' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                                    <Settings size={14} className="inline mr-1 mb-0.5"/> Cài Đặt
                                                </button>
                                                <button onClick={() => setActiveShopTab('monitor')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeShopTab === 'monitor' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                                    <Layers size={14} className="inline mr-1 mb-0.5"/> Giám Sát
                                                </button>
                                            </div>

                                            <div className="p-4 md:p-6 pl-4 md:pl-16">
                                                {/* CORE TAB */}
                                                {activeShopTab === 'core' && (
                                                    <div className="space-y-8 animate-in fade-in duration-300">
                                                        {/* NỘI DUNG AI (CORE) */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2 underline">
                                                                    <Brain size={14} className="text-indigo-600"/> THÔNG TIN CỬA HÀNG (CORE KNOWLEDGE)
                                                                </p>
                                                                <button 
                                                                    onClick={async () => {
                                                                        const productInfo = (document.getElementById(`core-info-${shop.id}`) as HTMLTextAreaElement).value;
                                                                        const pricingInfo = (document.getElementById(`core-price-${shop.id}`) as HTMLTextAreaElement).value;
                                                                        const faq = (document.getElementById(`core-faq-${shop.id}`) as HTMLTextAreaElement).value;
                                                                        
                                                                        const res = await fetch('/api/admin/update-config', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ shopId: shop.id, productInfo, pricingInfo, faq })
                                                                        });
                                                                        const data = await res.json();
                                                                        
                                                                        if (res.ok && data.success) {
                                                                            addToast('Đã cập nhật nội dung AI thành công!', 'success');
                                                                            fetchShops();
                                                                        } else addToast('Lỗi cập nhật: ' + (data.error || 'Lỗi server'), 'error');
                                                                    }}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-100"
                                                                >Lưu thay đổi nội dung</button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest">Thông tin sản phẩm</label>
                                                                    <textarea 
                                                                        id={`core-info-${shop.id}`}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 leading-relaxed outline-none focus:border-indigo-500 min-h-[150px] shadow-inner custom-scrollbar"
                                                                        defaultValue={shopConfigs[shop.id]?.product_info || ''}
                                                                        placeholder="Mô tả sản phẩm, dịch vụ của shop..."
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest">Thông tin giá cả</label>
                                                                    <textarea 
                                                                        id={`core-price-${shop.id}`}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 leading-relaxed outline-none focus:border-indigo-500 min-h-[150px] shadow-inner custom-scrollbar"
                                                                        defaultValue={shopConfigs[shop.id]?.pricing_info || ''}
                                                                        placeholder="Chính sách giá, khuyến mãi..."
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest">Câu hỏi thường gặp (FAQ)</label>
                                                                    <textarea 
                                                                        id={`core-faq-${shop.id}`}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-bold text-slate-700 leading-relaxed outline-none focus:border-indigo-500 min-h-[150px] shadow-inner custom-scrollbar"
                                                                        defaultValue={shopConfigs[shop.id]?.faq || ''}
                                                                        placeholder="Các câu hỏi khách hay hỏi..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                                                            {/* ICON CONFIG */}
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><ImageIcon size={12}/> Hình đại diện (Icon Bot)</p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button 
                                                                        onClick={() => handleUpdateIcon(shop.id, '/icons/bot-male.png')} 
                                                                        className={`bg-white/5 p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${activeIcons[shop.id] === '/icons/bot-male.png' ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                                                    >
                                                                        <div className="text-2xl">👨</div><span className="text-[9px] font-black uppercase">BOT NAM</span>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleUpdateIcon(shop.id, '/icons/bot-female.png')} 
                                                                        className={`bg-white/5 p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${activeIcons[shop.id] === '/icons/bot-female.png' ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                                                    >
                                                                        <div className="text-2xl">👩</div><span className="text-[9px] font-black uppercase">BOT NỮ</span>
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
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CHANNELS TAB */}
                                                {activeShopTab === 'channels' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-300">
                                                        {/* FACEBOOK CONFIG */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-indigo-400"><MessageCircle size={12}/> Cấu hình Facebook</p>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Page ID</label>
                                                                    <input type="text" placeholder="Nhập ID Fanpage..." id={`fbp-id-${shop.id}`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-indigo-500" defaultValue={shopConfigs[shop.id]?.facebook_page_id || ''} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Page Access Token</label>
                                                                    <div className="relative">
                                                                        <input type={showKeys[`fbp-${shop.id}`] ? "text" : "password"} placeholder="Nhập Token của Page..." id={`fbp-token-${shop.id}`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-[10px] font-bold outline-none focus:border-indigo-500" defaultValue={shopConfigs[shop.id]?.facebook_access_token || ''} />
                                                                        <button type="button" onClick={() => setShowKeys(p => ({ ...p, [`fbp-${shop.id}`]: !p[`fbp-${shop.id}`] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"><Eye size={14} /></button>
                                                                    </div>
                                                                </div>
                                                                <button onClick={async () => {
                                                                    const pageId = (document.getElementById(`fbp-id-${shop.id}`) as HTMLInputElement).value;
                                                                    const pageToken = (document.getElementById(`fbp-token-${shop.id}`) as HTMLInputElement).value;
                                                                    try {
                                                                        const res = await fetch('/api/admin/update-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: shop.id, facebookPageId: pageId, facebookAccessToken: pageToken }) });
                                                                        const data = await res.json();
                                                                        if (res.ok && data.success) { addToast('Đã lưu cấu hình FB thành công!', 'success'); fetchShops(); }
                                                                        else addToast('Lỗi: ' + (data.error || 'Unknown'), 'error');
                                                                    } catch (e: any) { addToast('Lỗi kết nối', 'error'); }
                                                                }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-[10px] font-black uppercase transition-all">Lưu Cấu Hình FB</button>
                                                            </div>
                                                        </div>

                                                        {/* TELEGRAM CONFIG */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-sky-400"><Send size={12}/> Cấu hình Telegram</p>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Chat ID (Admin)</label>
                                                                    <input type="text" placeholder="Nhập Chat ID Telegram..." id={`tg-chat-id-${shop.id}`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-sky-500" defaultValue={shopConfigs[shop.id]?.telegram_chat_id || ''} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Bot Token (Riêng - Nếu có)</label>
                                                                    <input type="password" placeholder="Để trống nếu dùng Bot hệ thống..." id={`tg-bot-token-${shop.id}`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-sky-500" defaultValue={shopConfigs[shop.id]?.telegram_bot_token || ''} />
                                                                </div>
                                                                <button onClick={async () => {
                                                                    const tgChatId = (document.getElementById(`tg-chat-id-${shop.id}`) as HTMLInputElement).value;
                                                                    const tgBotToken = (document.getElementById(`tg-bot-token-${shop.id}`) as HTMLInputElement).value;
                                                                    try {
                                                                        const res = await fetch('/api/admin/update-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: shop.id, telegramChatId: tgChatId, telegramBotToken: tgBotToken }) });
                                                                        const data = await res.json();
                                                                        if (res.ok && data.success) { addToast('Đã lưu cấu hình TG thành công!', 'success'); fetchShops(); }
                                                                        else addToast('Lỗi: ' + (data.error || 'Unknown'), 'error');
                                                                    } catch (e: any) { addToast('Lỗi kết nối', 'error'); }
                                                                }} className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-xl py-2 text-[10px] font-black uppercase transition-all">Lưu Cấu Hình TG</button>
                                                            </div>
                                                        </div>

                                                        {/* MANYCHAT INTEGRATION */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-blue-400"><MessageCircle size={12}/> Kết nối ManyChat</p>
                                                            <div className="space-y-4">
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <p className="text-[8px] font-black text-slate-500 uppercase">ManyChat API Key</p>
                                                                        <button onClick={() => setShowManyChatKeys(prev => ({ ...prev, [shop.id]: !prev[shop.id] }))} className="text-[8px] text-blue-400 font-bold underline uppercase">{showManyChatKeys[shop.id] ? 'Ẩn' : 'Hiện'}</button>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <input type={showManyChatKeys[shop.id] ? "text" : "password"} readOnly value={shop.manychat_api_key || 'Chưa tạo key'} className="flex-1 bg-transparent text-[10px] font-mono font-bold text-blue-300 outline-none" />
                                                                        <button onClick={() => { if (shop.manychat_api_key) { navigator.clipboard.writeText(shop.manychat_api_key); addToast('Đã copy API Key', 'success'); } }} className="text-slate-500 hover:text-white"><Copy size={12}/></button>
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
                                                                    <button onClick={() => { const json = JSON.stringify({ shop_code: shop.code, user_id: "{{user_id}}", message: "{{last_input}}" }, null, 2); navigator.clipboard.writeText(json); addToast('Đã copy JSON cấu hình', 'success'); }} className="w-full mt-2 bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all">Copy JSON Cấu hình</button>
                                                                </div>
                                                                <button onClick={() => handleRegenerateManyChatKey(shop.id)} className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30 rounded-xl py-2 text-[9px] font-black uppercase transition-all">{shop.manychat_api_key ? 'Cấp lại API Key' : 'Tạo API Key'}</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SETTINGS TAB */}
                                                {activeShopTab === 'settings' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-300">
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
                                                                            <button onClick={() => handleRemovePackage(shop.id, pkg.id)} className="text-slate-500 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer" title="Gỡ gói này"><Trash2 size={12}/></button>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* PIN CONFIG */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline text-rose-400"><Lock size={12}/> Mã mở khóa Cấu hình AI</p>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block italic opacity-70 underline decoration-rose-500/30">Nếu để trống, Shop Free sẽ bị KHÓA vĩnh viễn cho đến khi bạn đặt mã</label>
                                                                    <input type="text" placeholder="Thiết lập mã tại đây để cấp cho khách..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-rose-500" id={`pin-${shop.id}`} defaultValue={shop.pin_hash || ''} />
                                                                </div>
                                                                <button onClick={async () => {
                                                                    const newPin = (document.getElementById(`pin-${shop.id}`) as HTMLInputElement).value;
                                                                    try {
                                                                        const res = await fetch('/api/config/reset-pin', { method: 'POST', body: JSON.stringify({ shopId: shop.id, newPin, requesterId: currentUserId }) });
                                                                        const verify = await res.json();
                                                                        if (verify.success) { addToast(newPin ? 'Đã thiết lập MÃ MỞ KHÓA thành công!' : 'Đã GỠ KHÓA cấu hình cho shop!', 'success'); fetchShops(); }
                                                                        else addToast('Lỗi: ' + verify.error, 'error');
                                                                    } catch (e) { addToast('Lỗi máy chủ', 'error'); }
                                                                }} className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-2 text-[10px] font-black uppercase transition-all shadow-lg shadow-rose-900/20">Lưu Mã Mở Khóa</button>
                                                            </div>
                                                        </div>

                                                        {/* ACCOUNT CONFIG */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 underline"><Mail size={12}/> Tài khoản & Mật khẩu</p>
                                                            <div className="space-y-4">
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Email đăng nhập:</p>
                                                                    <p className="text-xs font-bold font-mono text-indigo-300 truncate">{shop.users?.[0]?.email || 'Chưa gán tài khoản'}</p>
                                                                </div>
                                                                <button onClick={() => handleResetPassword(shop.id)} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ring-4 ring-amber-500/10 flex items-center justify-center gap-2"><Lock size={14}/> ĐỔI MẬT KHẨU</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleTestTelegram(shop.id); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ring-4 ring-indigo-500/10 flex items-center justify-center gap-2 mt-2"><Send size={14}/> TEST TELEGRAM</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* MONITOR TAB */}
                                                {activeShopTab === 'monitor' && (
                                                    <div className="animate-in fade-in duration-300">
                                                        <ChatHistoryMonitor shopId={shop.id} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
"""

new_content = content[:start_idx] + new_block + '\n' + content[end_idx:]

with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(new_content)

print('Successfully applied layout update!')
