// Socket.IO chat wiring for CampusSwap
// Assumes socket.io client script is loaded globally as `io`.

(function initSocketChat() {
  // Use the same backend base URL as script.js (it hardcodes BASE_URL)
  // but fall back safely if script.js didn't load (or if you are running locally).
  const BASE_URL = window.BASE_URL || 'https://retailsystem-1.onrender.com';
  const CHAT_URL = `${BASE_URL}/api/chats`;


  let socket = null;
  let activeChatId = null;

  // DOM references (exist after script.js ensures chat panel)
  function getChatMessagesEl() {
    return document.getElementById('chatMessages');
  }

  function safeEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  function ensureSocket() {
    if (socket) return socket;
    const token = getToken();
    if (!token) return null;

    // Force socket connection to backend host (avoids accidentally using the frontend/Vercel host)
    socket = io(BASE_URL, {
      auth: { token },
      // Let Socket.IO choose transports; forcing websocket can fail depending on hosting/network.
    });


    socket.on('connect', () => {
      // connected
    });

    socket.on('disconnect', () => {
      // will reconnect automatically
    });

    socket.on('newMessage', (payload) => {
      try {
        if (!payload) return;

        const message = payload.message;
        if (!message) return;

        // If chatId is provided by server, filter; otherwise rely only on open chat.
        if (payload.chatId && activeChatId && String(payload.chatId) !== String(activeChatId)) return;



        const chatMessages = getChatMessagesEl();
        if (!chatMessages) return;

        const me = getUser();
        const myId = me?.id || me?._id;
        const isMine = String(message.senderId) === String(myId);

        const div = document.createElement('div');
        div.className = `chat-msg ${isMine ? 'mine' : 'theirs'}`;
        div.id = message._id || ('msg-' + Date.now());

        // NOTE: message from server contains {senderId, senderName, text, image, createdAt}
        div.innerHTML = `
          <span class="msg-name">${isMine ? 'You' : message.senderName}</span>
          ${message.image ? `<span class="msg-image"><img src="${message.image}" style="max-width:240px;max-height:180px;border-radius:12px;display:block;"/></span>` : ''}
          ${message.text ? `<span class="msg-text">${safeEscape(message.text)}</span>` : ''}
          <span class="msg-time">${formatTime(message.createdAt)}</span>
        `;

        // Remove any pending temp message (optional). Current script.js uses 'pending' class.
        const pending = chatMessages.querySelector('.chat-msg.mine.pending');
        if (pending) {
          pending.classList.remove('pending');
          // keep it; the full loadChatMessages will eventually reconcile.
        }

        // Avoid duplicates when user also loads via REST
        const existing = message._id ? chatMessages.querySelector('#' + message._id) : null;
        if (!existing) chatMessages.appendChild(div);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Notification for incoming messages when this chat is NOT currently open
        try {
          if (typeof window.addNotification === 'function') {
            const isOpenChat = activeChatId && payload.chatId && String(payload.chatId) === String(activeChatId);
            if (!isOpenChat && !isMine) {
              const chatTitle = document.getElementById('chatItemTitle')?.textContent || 'New message';
              const senderName = message.senderName || 'User';
              window.addNotification('msg', `Message from ${senderName}`, message.text ? String(message.text).slice(0, 80) : '📷 Image received');
            }
          }
        } catch {}

      } catch {
        // ignore
      }
    });

    return socket;
  }

  function joinChat(chatId) {
    activeChatId = chatId;
    const s = ensureSocket();
    if (!s) return;
    s.emit('joinChat', { chatId });
  }

  function leaveChat(chatId) {
    const s = socket;
    if (!s || !chatId) return;
    s.emit('leaveChat', { chatId });
    if (String(activeChatId) === String(chatId)) activeChatId = null;
  }

  // Expose to existing script.js
  window.__csSocketChat = {
    joinChat,
    leaveChat,
    ensureSocket
  };

  // When token changes (login/logout), reconnect auth.
  // script.js clears localStorage on logout, so this will naturally fail auth.
  window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
      try {
        if (socket) socket.close();
      } catch {}
      socket = null;
    }
  });
})();

