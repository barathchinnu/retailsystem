// ═══════════════════════════════════════════════════
//   CampusSwap V2 — socketio-chat.js (Companion Mode)
// ═══════════════════════════════════════════════════

(function () {
    let socket = null;
    let activeChatId = null;

    const getToken = () => localStorage.getItem('token');
    const getUser = () => {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    };

    const cleanIdString = (id) => {
        if (!id) return '';
        return String(id).replace('chat:', '').trim();
    };

    // ─── Socket Connection Gateways ────────────────────────────────────────────
    function initSocket() {
        const token = getToken();
        const baseUrl = window.BASE_URL || 'https://retailsystem-1.onrender.com';

        if (!token) return null;
        if (socket && socket.connected) return socket;

        console.log('🔄 Initializing Socket.io engine via script.js trigger...');
        
        socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('⚡ Connected to CampusSwap real-time chat server.');
            if (activeChatId) {
                const cleanId = cleanIdString(activeChatId);
                socket.emit('joinRoom', { chatId: cleanId });
                socket.emit('join', cleanId);
                socket.emit('joinRoom', { chatId: `chat:${cleanId}` });
                socket.emit('join', `chat:${cleanId}`);
            }
        });

        // Intercept real-time incoming traffic
        socket.on('newMessage', (payload) => {
            console.log('📩 Live message caught by WebSocket stream:', payload);
            if (!payload || !activeChatId) return;

            // Normalize payload structure down from backend broadcast
            const messageData = payload.message || payload;
            const incomingChatId = payload.chatId || messageData.chatId || messageData.chat || payload.chat;

            const normalizedActive = cleanIdString(activeChatId);
            const normalizedIncoming = cleanIdString(incomingChatId);

            if (normalizedActive === normalizedIncoming && normalizedActive !== '') {
                // Squelch duplicate handling if the message was already optimistically appended by your own click event
                if (messageData._id && document.getElementById(messageData._id)) {
                    console.log('🏁 Message already rendered on UI layout. Skipping append.');
                    // Still update the count so polling doesn't re-render
                    if (window.chatLastSeenCount !== undefined) window.chatLastSeenCount++;
                    return;
                }
                
                const msgsContainer = document.getElementById('chatMessages');
                if (msgsContainer) {
                    appendMessageToExistingPanel(messageData);
                    // Keep chatLastSeenCount in sync with script.js to prevent polling double-render
                    if (typeof chatLastSeenCount !== 'undefined') chatLastSeenCount++;
                    console.log('✅ Appended live text directly to your existing UI view.');
                } else {
                    // Panel not visible — let polling handle it when user opens chat
                    console.log('⚠️ Chat panel not open — socket message queued for next poll.');
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server.');
        });

        return socket;
    }
// ─── Core Hook Linked From script.js ───────────────────────────────────────
    async function joinChat(chatId) {
        console.log(`🚀 Hook captured! Room registration for ID: ${chatId}`);
        activeChatId = chatId;

        // Ensure we initialize the socket IF it doesn't exist yet
        if (!socket || !socket.connected) {
            console.log('⏳ Waiting for socket initialization...');
            initSocket();
        }

        // Now that initSocket has run, socket MUST be defined
        if (socket) {
            const cleanId = cleanIdString(chatId);
            console.log(`📡 Emitting joinRoom for: ${cleanId}`);
            socket.emit('joinRoom', { chatId: cleanId });
            socket.emit('join', cleanId);
        }
    }

    // ─── Dynamic Insertion Into Your Panel (Synchronized with script.js Framework) ───
    function appendMessageToExistingPanel(messageData) {
        const msgsContainer = document.getElementById('chatMessages');

        if (!msgsContainer) {
            console.warn("⚠️ WebSocket caught the message but couldn't locate your #chatMessages container.");
            return;
        }

        // Wipe out "No messages yet" text if it's visible on screen
        const noMsgsEl = msgsContainer.querySelector('.no-msgs');
        if (noMsgsEl) noMsgsEl.remove();

        const messageText = messageData.text || '';
        const imageUrl = messageData.image || '';
        const rawSender = messageData.senderId || messageData.sender;
        const senderId = (typeof rawSender === 'object' && rawSender !== null) ? rawSender._id : rawSender;
        const senderName = messageData.senderName || (senderId ? 'User' : 'Other');

        const currentUser = getUser();
        const currentUserId = currentUser?._id || currentUser?.id;
        const isMine = String(senderId) === String(currentUserId);

        // Build the precise DOM layout used by script.js
        const msgDiv = document.createElement('div');
        if (messageData._id) msgDiv.id = messageData._id;
        msgDiv.className = `chat-msg ${isMine ? 'mine' : 'theirs'}`;
        
        const timestamp = messageData.createdAt ? new Date(messageData.createdAt) : new Date();
        const displayTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <span class="msg-name">${isMine ? 'You' : escapeHtml(senderName)}</span>
            ${imageUrl ? `<span class="msg-image"><img src="${imageUrl}" style="max-width:240px;max-height:180px;border-radius:12px;display:block;"/></span>` : ''}
            ${messageText ? `<span class="msg-text">${escapeHtml(messageText)}</span>` : ''}
            <span class="msg-time">${displayTime}</span>
        `;
        
        msgsContainer.appendChild(msgDiv);
        
        // Auto scroll cleanly down
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // ─── Export Interface
    window.__csSocketChat = {
        joinChat: joinChat,
        disconnectSocket: () => {
            if (socket) {
                socket.disconnect();
                socket = null;
                console.log('👋 Socket cleared successfully.');
            }
        }
    };
})();