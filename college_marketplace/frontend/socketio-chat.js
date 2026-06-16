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
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

    const ioClient = window.io || (typeof io !== 'undefined' ? io : null);
    if (!ioClient) {
      const activeBaseUrl = window.BASE_URL || 'https://retailsystem-1.onrender.com';
      if (!window.__loadingSocketIoScript) {
        window.__loadingSocketIoScript = true;
        console.warn('Socket.io client script not found. Loading dynamically from backend...');
        const script = document.createElement('script');
        script.src = `${activeBaseUrl}/socket.io/socket.io.js`;
        script.onload = () => {
          console.log('Socket.io client script loaded dynamically.');
          window.__loadingSocketIoScript = false;
          if (activeChatId) joinChat(activeChatId);
        };
        script.onerror = () => {
          console.error('Failed to load Socket.io client script.');
          window.__loadingSocketIoScript = false;
        };
        document.head.appendChild(script);
      }
      return null;
    }

    const activeBaseUrl = window.BASE_URL || 'https://retailsystem-1.onrender.com';

    socket = ioClient(activeBaseUrl, {
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Socket.io connected successfully:', socket.id);
    });

    socket.on('disconnect', () => {
      console.warn('Socket.io disconnected.');
    });

    socket.on('newMessage', (payload) => {
      try {
        if (!payload) return;

        const message = payload.message;
        if (!message) return;

        if (payload.chatId && activeChatId && String(payload.chatId) !== String(activeChatId)) return;

        const chatMessages = getChatMessagesEl();
        if (!chatMessages) return;

        const me = getUser();
        const myId = me ? (me.id || me._id) : null;
        
        let isMine = false;
        if (myId && message.senderId) {
            isMine = String(message.senderId).toLowerCase() === String(myId).toLowerCase();
        }

        const div = document.createElement('div');
        div.className = `chat-msg ${isMine ? 'mine' : 'theirs'}`;
        div.id = message._id || ('msg-' + Date.now());

        div.innerHTML = `
          <span class="msg-name">${isMine ? 'You' : message.senderName}</span>
          ${message.image ? `<span class="msg-image"><img src="${message.image}" style="max-width:240px;max-height:180px;border-radius:12px;display:block;"/></span>` : ''}
          ${message.text ? `<span class="msg-text">${safeEscape(message.text)}</span>` : ''}
          <span class="msg-time">${formatTime(message.createdAt)}</span>
        `;

        // Remove any pending temp message to avoid duplicates
        const pending = chatMessages.querySelector('.chat-msg.mine.pending');
        if (pending) pending.remove();

        // If it's our own message, the HTTP POST optimistic UI already handled it — skip
        if (isMine) { chatMessages.scrollTop = chatMessages.scrollHeight; return; }

        // Avoid duplicates when user also loads via REST
        const existing = message._id ? document.getElementById(message._id) : null;
        if (!existing) chatMessages.appendChild(div);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Notification for incoming messages when this chat is NOT currently open
        try {
          if (typeof window.addNotification === 'function') {
            const isOpenChat = activeChatId && payload.chatId && String(payload.chatId) === String(activeChatId);
            if (!isOpenChat && !isMine) {
              const senderName = message.senderName || 'User';
              window.addNotification('msg', `Message from ${senderName}`, message.text ? String(message.text).slice(0, 80) : '📷 Image received');
            }
          }
        } catch {}

      } catch (err) {
        console.error('Socket message append error:', err);
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

  function disconnectSocket() {
    if (socket) {
      try {
        socket.disconnect();
      } catch {}
      socket = null;
    }
    activeChatId = null;
  }

  // Expose to existing script.js
  window.__csSocketChat = {
    joinChat,
    leaveChat,
    ensureSocket,
    disconnectSocket
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

