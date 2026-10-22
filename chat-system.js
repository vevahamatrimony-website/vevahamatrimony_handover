// chat-system.js
// Handles fetching conversations and messages, and sending new ones

document.addEventListener('DOMContentLoaded', () => {
    if (!window.VMAuth || !VMAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const threadsList = document.getElementById('threadsList');
    const noThreadsMessage = document.getElementById('noThreadsMessage');
    const totalThreadsCount = document.getElementById('totalThreadsCount');
    const chatHeader = document.getElementById('chatHeader');
    const callButtons = document.getElementById('callButtons');
    const messagesContainer = document.getElementById('messagesContainer');
    const noConversationMessage = document.getElementById('noConversationMessage');
    const messageInputContainer = document.getElementById('messageInputContainer');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    // Add Enter key support for sending messages
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageWithAI();
            }
        });
    }

    let currentActiveMemberId = null;
    let pollingInterval = null;
    let currentRecipientData = null;
    let currentHidePhoto = false;

    async function loadConversations() {
        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch('/api/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.conversations) {
                renderThreads(data.conversations);
                
                // Auto-open chat if ?chat=ID is present
                const params = new URLSearchParams(window.location.search);
                const chatWith = params.get('chat');
                if (chatWith && !currentActiveMemberId) {
                    const conv = data.conversations.find(c => c.member_id === chatWith);
                    if (conv) {
                        loadThread(conv.member_id, conv.name, conv.photo);
                        // Clean URL
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }

    function renderThreads(conversations) {
        if (!threadsList) return;
        threadsList.innerHTML = '';
        if (totalThreadsCount) totalThreadsCount.textContent = conversations.length;

        if (conversations.length === 0) {
            if (noThreadsMessage) {
                threadsList.appendChild(noThreadsMessage);
                noThreadsMessage.classList.remove('hidden');
            }
            return;
        }

        conversations.forEach(conv => {
            const div = document.createElement('div');
            div.className = `p-3 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${conv.member_id === currentActiveMemberId ? 'bg-pink-50 border-l-4 border-pink-600' : 'hover:bg-gray-50'
                }`;

            const isPhotoLocked = conv.hide_photo === true || conv.hide_photo === 'true';
            div.onclick = () => loadThread(conv.member_id, conv.name, conv.photo, isPhotoLocked);

            const pic = conv.photo || '/images/placeholder-profile.svg';
            const name = conv.name || 'Member';

            let badge = '';
            if (conv.unread > 0) {
                badge = `<span class="bg-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${conv.unread}</span>`;
            }

            div.innerHTML = `
                <div class="relative w-12 h-12 flex-shrink-0">
                    <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-sm">
                        <img src="${pic}" onerror="this.src='/images/placeholder-profile.svg'" class="w-full h-full object-cover" style="${isPhotoLocked ? 'filter: blur(12px) grayscale(50%); clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%); pointer-events: none;' : ''}">
                    </div>
                    ${isPhotoLocked ? `<div class="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-gray-300 shadow z-10"><i class="fas fa-lock text-gray-600" style="font-size: 8px;"></i></div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-800 truncate text-sm">${name}</h4>
                    <p class="text-xs text-gray-500 truncate mt-1">${conv.last_message || 'No messages yet'}</p>
                </div>
                ${badge}
            `;
            threadsList.appendChild(div);
        });
    }

    async function loadThread(memberId, name, photo, hidePhoto) {
        if (currentActiveMemberId !== memberId) {
            currentActiveMemberId = memberId;
            currentHidePhoto = hidePhoto || false;
            if (pollingInterval) clearInterval(pollingInterval);
            startPolling();
        }

        // Helper: safe element operation
        const el = (id) => document.getElementById(id);

        // Update UI Header — guard every element
        if (chatHeader) chatHeader.classList.remove('hidden');
        if (el('chatUserName')) {
            el('chatUserName').textContent = name;
            el('chatUserName').style.cursor = 'pointer';
            el('chatUserName').onclick = () => { window.location.href = 'connections.html'; };
        }
        if (el('chatUserAvatar')) {
            const isPhotoLocked = hidePhoto === true || hidePhoto === 'true';
            el('chatUserAvatar').src = photo || '/images/placeholder-profile.svg';
            el('chatUserAvatar').style.filter = isPhotoLocked ? 'blur(12px) grayscale(50%)' : 'none';
            if (isPhotoLocked) {
                el('chatUserAvatar').style.clipPath = 'circle(50% at 50% 50%)';
                el('chatUserAvatar').style.webkitClipPath = 'circle(50% at 50% 50%)';
                if (el('chatUserLockBadge')) el('chatUserLockBadge').classList.remove('hidden');
            } else {
                el('chatUserAvatar').style.clipPath = 'none';
                el('chatUserAvatar').style.webkitClipPath = 'none';
                if (el('chatUserLockBadge')) el('chatUserLockBadge').classList.add('hidden');
            }
            el('chatUserAvatar').style.cursor = 'pointer';
            el('chatUserAvatar').onclick = () => { window.location.href = 'connections.html'; };
            el('chatUserAvatar').onerror = function () { this.src = '/images/placeholder-profile.svg'; };
        }
        if (callButtons) { callButtons.classList.remove('hidden'); callButtons.style.display = 'flex'; }
        if (messageInputContainer) {
            messageInputContainer.classList.remove('hidden');
            messageInputContainer.style.display = 'block';
        }
        if (noConversationMessage) noConversationMessage.classList.add('hidden');

        if (!messagesContainer) return; // nothing to render into

        // Don't show spinner if background polling
        if (!messagesContainer.children.length || messagesContainer.contains(noConversationMessage)) {
            messagesContainer.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin text-pink-600"></i> Loading...</div>';
        }

        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch(`/api/messages/${memberId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                // Determine if we should force scroll (first load or no msg-bubbles)
                const isFirstLoad = !messagesContainer.querySelectorAll('.msg-bubble').length;
                renderMessages(data.messages || [], isFirstLoad);

                if (data.recipient) {
                    currentRecipientData = data.recipient; // Store for calling
                    const recipientHidePhoto = data.recipient.hide_photo === true || data.recipient.hide_photo === 'true';
                    // Update the global hide photo state from server truth
                    currentHidePhoto = recipientHidePhoto;
                    if (el('chatUserAvatar')) {
                        const avatarSrc = data.recipient.profile_picture_url || photo || '/images/placeholder-profile.svg';
                        el('chatUserAvatar').src = avatarSrc;
                        el('chatUserAvatar').setAttribute('data-original-src', avatarSrc);
                        el('chatUserAvatar').style.filter = recipientHidePhoto ? 'blur(12px) grayscale(50%)' : 'none';
                        if (recipientHidePhoto) {
                            el('chatUserAvatar').style.clipPath = 'circle(50% at 50% 50%)';
                            el('chatUserAvatar').style.webkitClipPath = 'circle(50% at 50% 50%)';
                            if (el('chatUserLockBadge')) el('chatUserLockBadge').classList.remove('hidden');
                        } else {
                            el('chatUserAvatar').style.clipPath = 'none';
                            el('chatUserAvatar').style.webkitClipPath = 'none';
                            if (el('chatUserLockBadge')) el('chatUserLockBadge').classList.add('hidden');
                        }
                    }

                    const online = (window.VM && VM.profile)
                        ? VM.profile.isOnline(data.recipient.last_seen, data.recipient.is_manually_online)
                        : false;
                    currentRecipientData.isOnline = online;

                    if (el('chatUserStatus')) {
                        el('chatUserStatus').innerHTML = online
                            ? '<span class="text-green-500 flex items-center gap-1"><i class="fas fa-circle text-[6px]"></i> Online</span>'
                            : '<span class="text-gray-400">Offline</span>';
                    }
                    if (el('chatUserPlan')) {
                        el('chatUserPlan').textContent = (data.recipient.plan_name || 'Free').toUpperCase();
                    }
                }
            } else {
                messagesContainer.innerHTML = `<div class="text-center p-4 text-red-500">${data.error || 'Failed to load thread'}</div>`;
            }
        } catch (err) {
            console.error('Failed to load thread:', err);
        }
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            if (currentActiveMemberId && messagesContainer) {
                const nameEl = document.getElementById('chatUserName');
                const avatarEl = document.getElementById('chatUserAvatar');
                loadThread(
                    currentActiveMemberId,
                    nameEl ? nameEl.textContent : '',
                    avatarEl ? avatarEl.getAttribute('data-original-src') || avatarEl.src : '',
                    currentHidePhoto
                );
            }
        }, 3000);
    }

    function renderMessages(messages, forceScroll = false) {
        if (!messagesContainer) return;
        
        // Threshold for "at bottom" (50px buffer)
        const threshold = 50;
        const wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + threshold;
        const currentCount = messagesContainer.querySelectorAll('.msg-bubble').length;

        // Optimization: If no new messages and not a force scroll, don't re-render entirely
        // This prevents scroll jumping
        if (!forceScroll && messages.length === currentCount && currentCount > 0) {
            // Potentially update ticks/status here in a real app, 
            // but for now we skip to prevent jumping
            return;
        }

        messagesContainer.innerHTML = '';
        let currentUser = {};
        try { currentUser = JSON.parse(localStorage.getItem('userData') || '{}'); } catch(e) {}
        const myId = currentUser.id || VMAuth.user()?.id;

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="text-center p-4 text-gray-500">No messages yet. Say hi!</div>';
            return;
        }

        messages.forEach(msg => {
            const isMine = msg.sender_id === myId;
            const bubbleClass = isMine ? 'msg-mine' : 'msg-other';
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Ticks logic
            let ticks = '';
            if (isMine && !msg.is_deleted) {
                const tickClass = msg.is_read ? 'tick-blue' : 'tick-gray';
                const tickIcon = msg.is_read ? 'fa-check-double' : 'fa-check';
                ticks = `<i class="fas ${tickIcon} tick-icon ${tickClass} ml-1"></i>`;
            }

            const div = document.createElement('div');
            div.className = `msg-bubble ${bubbleClass}`;
            
            const content = msg.is_deleted 
                ? `<span class="deleted-msg"><i class="fas fa-ban mr-1"></i> This message was deleted</span>`
                : msg.content;

            const editedLabel = (msg.is_edited && !msg.is_deleted) ? '<span class="text-[9px] opacity-70 mr-1">edited</span>' : '';

            div.innerHTML = `
                <div class="msg-content whitespace-pre-wrap">${content}</div>
                <div class="msg-time">
                    ${editedLabel} ${time} ${ticks}
                </div>
            `;
            messagesContainer.appendChild(div);
        });


        // Use requestAnimationFrame to let the DOM paint the height before getting scrollable area
        requestAnimationFrame(() => {
            if (forceScroll || wasAtBottom || currentCount === 0) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    }

    window.sendQuickMessage = function (text) {
        messageInput.value = text;
        sendMessageWithAI();
    }

    // Fallback if AI button is pressed
    window.sendMessageWithAI = async function () {
        const text = messageInput.value.trim();
        if (!text || !currentActiveMemberId) return;

        sendMessageBtn.disabled = true;
        const originalContent = sendMessageBtn.innerHTML;
        sendMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const token = localStorage.getItem('vm_token');
            
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ to_member_id: currentActiveMemberId, content: text })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.upgrade_required) window.location.href = 'membership.html';
                throw new Error(data.error);
            }

            messageInput.value = '';
            // Refresh thread immediately
            const resMsg = await fetch(`/api/messages/${currentActiveMemberId}`, { headers: { 'Authorization': `Bearer ${token}` }});
            const dataMsg = await resMsg.json();
            if (resMsg.ok) renderMessages(dataMsg.messages, true);
                
        } catch (err) {
            console.error('Message operation error:', err);
            if (window.VM && window.VM.toast) {
                window.VM.toast(err.message, 'error');
            } else if (window.showNotification) {
                window.showNotification(err.message, 'error');
            } else {
                alert(err.message);
            }
        } finally {
            sendMessageBtn.disabled = false;
            sendMessageBtn.innerHTML = originalContent;
        }
    }

    // Integrated calling logic (Synced with connections.js)
    window.startVoiceCall = function () {
        handleCallAction('voice');
    };

    window.startVideoCall = function () {
        handleCallAction('video');
    };

    async function handleCallAction(type) {
        if (!currentActiveMemberId || !currentRecipientData) return;
        
        try {
            const token = localStorage.getItem('vm_token');
            const userName = currentRecipientData.full_name || 'Member';

            // 1. Check membership permissions
            const res = await fetch('/api/membership/check', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'call' })
            });
            const result = await res.json();
            
            if (!result.allowed) {
                openUpgradeModal("Voice and Video calls are exclusive to Diamond/VIP members. Upgrade now!");
                return;
            }

            // 2. Status & Profile Type Check
            const isManaged = currentRecipientData.is_managed === true;
            const isOnline = currentRecipientData.isOnline;

            if (isManaged) {
                // ALWAYS REDIRECT MANAGED MEMBERS TO WHATSAPP (even for calls)
                if (window.VM && VM.toast) VM.toast(`Connecting with ${userName} via WhatsApp...`, 'info');
                
                try {
                    const contactRes = await fetch(`/api/requests/contact/${currentActiveMemberId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const contactData = await contactRes.json();
                    
                    if (contactData.mobile_number) {
                        let phone = contactData.mobile_number.replace(/\D/g, '');
                        if (phone.length === 10) phone = '91' + phone;
                        
                        setTimeout(() => {
                            window.open(`https://wa.me/${phone}`, '_blank');
                        }, 800);
                    } else {
                        throw new Error('Contact info unavailable');
                    }
                } catch (contactErr) {
                    console.error("Failed to fetch contact for WhatsApp:", contactErr);
                    VM.toast("Contact info unavailable", "error");
                }
                return;
            }

            if (!isOnline) {
                // DON'T REDIRECT REGISTERED USERS TO WHATSAPP
                if (window.VM && VM.toast) VM.toast(`${userName} is currently offline. Please try again later.`, 'warning');
                return;
            }

            // 3. Proceed with internal call
            window.location.href = `${type}-call.html?receiver=${currentActiveMemberId}`;

        } catch (err) {
            console.error("Error handling call:", err);
        }
    }

    // Modal Control Functions
    window.openUpgradeModal = function (message) {
        const modal = document.getElementById('upgradeModal');
        const msgEl = document.getElementById('upgradeModalMessage');
        if (msgEl) msgEl.textContent = message;
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.style.opacity = '1';
                modal.querySelector('.modal-box').style.transform = 'scale(1)';
            }, 10);
        }
    };

    window.closeUpgradeModal = function () {
        const modal = document.getElementById('upgradeModal');
        if (modal) {
            modal.style.opacity = '0';
            modal.querySelector('.modal-box').style.transform = 'scale(0.95)';
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }
    };

    // Init
    loadConversations();
    
    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});
