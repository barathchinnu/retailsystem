// ═══════════════════════════════════════════════════
//  CampusSwap V2 — script.js
// ═══════════════════════════════════════════════════

const BASE_URL = 'https://retailsystem-1.onrender.com';   // ← change to your V2 deploy URL
const API_URL = `${BASE_URL}/api/items`;
const AUTH_URL = `${BASE_URL}/api/auth`;
const CHAT_URL = `${BASE_URL}/api/chats`;

// ─── DOM ───────────────────────────────────────────────────────────────────────
const itemsGrid = document.getElementById('itemsGrid');
const sellForm = document.getElementById('sellForm');
const navSearchInput = document.getElementById('navSearchInput');
const categoryPills = document.querySelectorAll('.pill');
const itemModal = document.getElementById('itemModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('#itemModal .close');
const authModal = document.getElementById('authModal');
const authModalClose = document.getElementById('authModalClose');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const openLoginBtn = document.getElementById('openLoginBtn');
const openRegisterBtn = document.getElementById('openRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userGreeting = document.getElementById('userGreeting');

// ─── Auth State ────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function getUser() { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }

function updateAuthUI() {
    const user = getUser();
    document.querySelectorAll('.auth-logged-out').forEach(el => el.style.display = user ? 'none' : 'list-item');
    document.querySelectorAll('.auth-logged-in').forEach(el => el.style.display = user ? 'list-item' : 'none');

    // Admin dashboard link only when logged in (still protected by admin key in dashboard)
    const adminLinkBtn = document.getElementById('adminLinkBtn');
    if (adminLinkBtn) {
        adminLinkBtn.style.display = user ? 'list-item' : 'none';
    }

    if (user) {
        const badge = user.isVerified ? ' <span class="verified-badge" title="Verified KEC Student">✔ Verified</span>' : '';
        userGreeting.innerHTML = `<i class="fas fa-user-circle"></i> Hi, ${user.name.split(' ')[0]}${badge}`;
    }
}


// ─── Auth Modal ────────────────────────────────────────────────────────────────
openLoginBtn.addEventListener('click', e => { e.preventDefault(); switchToTab('login'); authModal.style.display = 'flex'; });
openRegisterBtn.addEventListener('click', e => { e.preventDefault(); switchToTab('register'); authModal.style.display = 'flex'; });
authModalClose.addEventListener('click', () => { authModal.style.display = 'none'; clearAuthErrors(); });

window.addEventListener('click', e => {
    if (e.target === authModal) { authModal.style.display = 'none'; clearAuthErrors(); }
    if (e.target === itemModal) { itemModal.style.display = 'none'; }
});

function switchToTab(tab) {
    const isLogin = tab === 'login';
    loginTab.classList.toggle('active', isLogin);
    registerTab.classList.toggle('active', !isLogin);
    loginForm.style.display = isLogin ? 'block' : 'none';
    registerForm.style.display = !isLogin ? 'block' : 'none';
    clearAuthErrors();
}
loginTab.addEventListener('click', () => switchToTab('login'));
registerTab.addEventListener('click', () => switchToTab('register'));

function showError(el, msg) { el.textContent = msg; el.classList.add('show'); }
function clearAuthErrors() { loginError.classList.remove('show'); registerError.classList.remove('show'); }

// ─── Login ─────────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
    e.preventDefault(); clearAuthErrors();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(`${AUTH_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const result = await res.json();
        if (result.success) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            authModal.style.display = 'none';
            loginForm.reset();
            updateAuthUI();
            showToast(`✅ Welcome back, ${result.user.name.split(' ')[0]}!`);
        } else { showError(loginError, result.error); }
    } catch { showError(loginError, 'Could not connect to server.'); }
});

// ─── Register ──────────────────────────────────────────────────────────────────
registerForm.addEventListener('submit', async e => {
    e.preventDefault(); clearAuthErrors();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const department = document.getElementById('registerDept').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    if (!email.toLowerCase().endsWith('@kongu.edu')) { showError(registerError, 'Only @kongu.edu emails are allowed.'); return; }
    if (password !== confirm) { showError(registerError, 'Passwords do not match.'); return; }
    try {
        const res = await fetch(`${AUTH_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, department }) });
        const result = await res.json();
        if (result.success) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            authModal.style.display = 'none';
            registerForm.reset();
            updateAuthUI();
            showToast(`🎉 Account created! Welcome, ${result.user.name.split(' ')[0]}!`);
        } else { showError(registerError, result.error); }
    } catch { showError(registerError, 'Could not connect to server.'); }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showToast('👋 Logged out successfully!');
});

// ─── Toast Notification ────────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
    let toast = document.getElementById('cs-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cs-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── Page Load ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('intro-active');

    const intro = document.getElementById('cinematic-intro');
    const introPreloader = document.getElementById('introPreloader');
    const introRing = document.getElementById('introRing');
    const introLoadText = document.getElementById('introLoadText');
    const canvas = document.getElementById('intro-canvas');

    // Stars
    const starsEl = document.getElementById('introStars');
    if (starsEl) {
        for (let i = 0; i < 120; i++) {
            const s = document.createElement('span');
            const size = Math.random() * 2.5 + 0.5;
            s.style.cssText = [`width:${size}px`, `height:${size}px`, `top:${Math.random() * 100}%`, `left:${Math.random() * 100}%`, `--d:${(Math.random() * 3 + 2).toFixed(1)}s`, `--delay:-${(Math.random() * 5).toFixed(1)}s`].join(';');
            starsEl.appendChild(s);
        }
    }

    if (intro) {
        setTimeout(() => { if (canvas) canvas.classList.add('visible'); }, 2200);
        setTimeout(() => { if (introRing) introRing.classList.add('hide'); if (introLoadText) introLoadText.classList.add('hide'); }, 3500);
        setTimeout(() => { if (introPreloader) introPreloader.classList.add('fade-out'); }, 4000);
        setTimeout(() => { intro.classList.add('hostel-scene-reveal-logo'); }, 5500);
        setTimeout(() => {
            intro.classList.add('hidden');
            setTimeout(() => { document.body.classList.remove('intro-active'); document.body.classList.add('site-loaded'); intro.remove(); }, 1000);
        }, 7000);
    } else {
        document.body.classList.add('site-loaded');
    }

    updateAuthUI();
    loadItems();
});

// ─── Load Items ────────────────────────────────────────────────────────────────
async function loadItems(filters = {}) {
    try {
        itemsGrid.innerHTML = '<div class="loading">Loading items...</div>';
        const params = new URLSearchParams(filters);
        const url = params.toString() ? `${API_URL}?${params}` : API_URL;
        const res = await fetch(url);
        const result = await res.json();
        if (result.success && result.data.length > 0) {
            displayItems(result.data);
        } else {
            itemsGrid.innerHTML = '<div class="no-items">No items found. Be the first to post! 🎉</div>';
        }
    } catch {
        itemsGrid.innerHTML = '<div class="no-items">Error loading items. Make sure the server is running.</div>';
    }
}

// ─── Display Items ─────────────────────────────────────────────────────────────
function displayItems(items) {
    itemsGrid.innerHTML = items.map(item => `
    <div class="item-card" data-id="${item._id}">
      <div class="item-image" ${item.image ? `style="background-image:url('${item.image}');background-size:cover;background-position:center;"` : ''}>
        ${!item.image ? `<i class="fas fa-${getCategoryIcon(item.category)}"></i>` : ''}
        ${item.isSold ? '<div class="sold-badge">SOLD</div>' : ''}
      </div>
      <div class="item-content">
        <div class="item-title">${item.title}</div>
        <div class="item-description">${truncate(item.description, 80)}</div>
        <div class="item-meta">
          <div class="item-price">₹${item.price}</div>
          <div class="item-condition">${item.condition.replace('_', ' ')}</div>
        </div>
        <div class="item-seller">
          <i class="fas fa-user"></i> ${item.seller_name} • ${item.department}
        </div>
        <div class="item-category">${item.category.replace('_', ' ')}</div>
      </div>
    </div>`).join('');

    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => showItemModal(card.dataset.id));
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('show'), i * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.item-card').forEach(c => observer.observe(c));
}

function getCategoryIcon(cat) {
    return { books: 'book', electronics: 'laptop', furniture: 'chair', lab_equipment: 'flask', bags: 'shopping-bag', sports: 'football', other: 'box' }[cat] || 'box';
}
function truncate(text, len) { return text.length > len ? text.substring(0, len) + '...' : text; }

// ─── Item Modal (V2 — no phone shown) ─────────────────────────────────────────
async function showItemModal(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const result = await res.json();
        if (!result.success) return;
        const item = result.data;
        const user = getUser();

        const isOwnItem = user && item.seller_email === user.email;
        const chatBtnHtml = !isOwnItem
            ? `<button class="modal-contact-btn chat-open-btn" data-itemid="${item._id}" data-sellerid="${item.sellerId}">
                 <i class="fas fa-comment-dots"></i> Chat with Seller
               </button>`
            : `<div class="own-item-note"><i class="fas fa-info-circle"></i> This is your listing</div>`;

        modalBody.innerHTML = `
          <h2>${item.title}</h2>
          ${item.image ? `<img src="${item.image}" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;margin-top:1rem;">` : ''}
          <div class="modal-item-price">₹${item.price}</div>
          <p><strong>Category:</strong> ${item.category.replace('_', ' ')}</p>
          <p><strong>Condition:</strong> ${item.condition.replace('_', ' ')}</p>
          <p><strong>Description:</strong></p>
          <p>${item.description}</p>
          <div class="modal-seller-info">
            <p><strong>Seller:</strong> ${item.seller_name}</p>
            <p><strong>Department:</strong> ${item.department}</p>
            <p><strong>Year:</strong> ${item.year}</p>
            <p><strong>Email:</strong> ${item.seller_email}</p>
            <p class="phone-hidden-note"><i class="fas fa-lock"></i> Phone number is hidden — start a chat to unlock it</p>
          </div>
          ${chatBtnHtml}
        `;

        // Wire up "Chat with Seller" button
        const chatBtn = modalBody.querySelector('.chat-open-btn');
        if (chatBtn) {
            chatBtn.addEventListener('click', async () => {
                if (!getToken()) {
                    switchToTab('login');
                    authModal.style.display = 'flex';
                    itemModal.style.display = 'none';
                    return;
                }
                itemModal.style.display = 'none';
                await openChat(item._id);
            });
        }

        itemModal.style.display = 'block';
    } catch { showToast('❌ Error loading item details'); }
}

// ─── Chat Panel ────────────────────────────────────────────────────────────────
let activeChatId = null;
const myChatsBtn =
    document.getElementById('myChatsBtn');

if (myChatsBtn) {

    myChatsBtn.addEventListener(
        'click',
        loadMyChats
    );

}

document
    .getElementById('closeChatList')
    ?.addEventListener(
        'click',
        () => {
            document
                .getElementById('chatListModal')
                .style.display = 'none';
        }
    );

async function loadMyChats(e) {

    if (e) e.preventDefault();

    try {

        const res = await fetch(
            CHAT_URL,
            {
                headers: {
                    Authorization:
                        `Bearer ${getToken()}`
                }
            }
        );

        const result = await res.json();

        if (!result.success) {

            showToast("Could not load chats");
            return;
        }

        const modal =
            document.getElementById(
                'chatListModal'
            );

        const container =
            document.getElementById(
                'chatListContainer'
            );

        const me = getUser();

        container.innerHTML =
            result.data.map(chat => {

                const myId = me.id || me._id;

                const other =
                    String(chat.buyerId?._id) === String(myId)
                        ? chat.sellerId
                        : chat.buyerId;

                return `
            <div
              class="chat-list-item"
              onclick="openExistingChat('${chat._id}')"
            >
               <strong>
                 ${chat.itemId?.title || 'Item'}
               </strong>

               <br>

               ${other.name}
            </div>
            `;
            }).join('');

        modal.style.display = 'block';

    }
    catch (err) {

        console.error(err);

        showToast(
            "Failed to load chats"
        );
    }
}

async function openExistingChat(chatId) {
    activeChatId = chatId;

    const panel = document.getElementById('chatPanel');

    if (!panel) {
        ensureChatPanel();
    }

    await loadChatMessages(chatId);

    document
        .getElementById('chatPanel')
        ?.classList.add('open');

    document
        .getElementById('chatListModal')
        .style.display = 'none';
}
// Inject chat panel once into the DOM
function ensureChatPanel() {
    if (document.getElementById('chatPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'chatPanel';
    panel.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <span id="chatItemTitle">Chat</span>
          <span id="chatOtherUser" class="chat-other-user"></span>
        </div>
        <div class="chat-header-actions">
          <button id="revealPhoneBtn" class="chat-action-btn" title="Unlock phone number">
            <i class="fas fa-lock"></i> Reveal Number
          </button>
          <button id="reportChatBtn" class="chat-action-btn report" title="Report this chat">
            <i class="fas fa-flag"></i>
          </button>
          <button id="rateDealBtn" class="chat-action-btn rate" title="Rate this deal">
            <i class="fas fa-star"></i>
          </button>
          <button id="closeChatBtn" class="chat-close-btn"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div id="chatMessages" class="chat-messages"></div>
      <div id="chatPhoneReveal" class="chat-phone-reveal hidden"></div>
      <div class="chat-input-row">
        <input type="text" id="chatInput" placeholder="Type a message…" maxlength="500">
        <button id="chatSendBtn"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;
    document.body.appendChild(panel);
    window.openExistingChat = openExistingChat;

    document.getElementById('closeChatBtn').addEventListener('click', () => {
        panel.classList.remove('open');
        activeChatId = null;
    });
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    document.getElementById('revealPhoneBtn').addEventListener('click', requestPhoneReveal);
    document.getElementById('reportChatBtn').addEventListener('click', reportChat);
    document.getElementById('rateDealBtn').addEventListener('click', openRatePanel);
}

async function openChat(itemId) {
    ensureChatPanel();
    showToast('Opening chat…');
    try {
        const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ itemId })
        });
        const result = await res.json();
        if (!result.success) { showToast('❌ ' + result.error); return; }
        activeChatId = result.data._id;
        await loadChatMessages(activeChatId);
        document.getElementById('chatPanel').classList.add('open');
    } catch { showToast('❌ Could not open chat. Check your connection.'); }
}

async function loadChatMessages(chatId) {
    try {
        const start = performance.now();
        const res = await fetch(`${CHAT_URL}/${chatId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
        const result = await res.json();
        if (!result.success) return;
        console.log('[Chat] load duration(ms):', Math.round(performance.now() - start), 'status:', res.status, 'msgs:', result.data?.messages?.length);

        const chat = result.data;
        const me = getUser();

        console.log("CHAT =", chat);
        console.log("ME =", me);

        const myId = me?.id || me?._id;

        const other = String(chat.buyerId?._id) === String(myId)
            ? chat.sellerId
            : chat.buyerId;
        const ratingStr = other.rating ? `⭐ ${other.rating} (${other.ratingCount})` : 'No ratings yet';
        const verifiedMark = other.isVerified ? ' ✔' : '';

        document.getElementById('chatItemTitle').textContent = chat.itemId?.title || 'Item';
        document.getElementById('chatOtherUser').textContent = `${other.name}${verifiedMark} • ${ratingStr}`;

        const msgs = document.getElementById('chatMessages');
        msgs.innerHTML = chat.messages.length === 0
            ? '<div class="no-msgs">No messages yet. Say hi! 👋</div>'
            : chat.messages.map(m => {
                const isMine = String(m.senderId) === String(me?.id || me?._id);
                return `<div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
                  <span class="msg-name">${isMine ? 'You' : m.senderName}</span>
                  <span class="msg-text">${escapeHtml(m.text)}</span>
                  <span class="msg-time">${formatTime(m.createdAt)}</span>
                </div>`;
            }).join('');
        msgs.scrollTop = msgs.scrollHeight;

        // Show revealed phone if already unlocked
        if (chat.phoneRevealed) {
            document.getElementById('revealPhoneBtn').innerHTML = '<i class="fas fa-unlock"></i> Number Unlocked';
        }
    } catch { showToast('❌ Could not load messages.'); }
}

async function sendMessage() {
    if (!activeChatId) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
        const res = await fetch(`${CHAT_URL}/${activeChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ text })
        });
        const result = await res.json();
        if (result.success) { await loadChatMessages(activeChatId); }
        else { showToast('❌ ' + result.error); }
    } catch { showToast('❌ Message failed to send.'); }
}

// ─── Phone Reveal ──────────────────────────────────────────────────────────────
async function requestPhoneReveal() {
    if (!activeChatId) return;
    try {
        const res = await fetch(`${CHAT_URL}/${activeChatId}/reveal-phone`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const result = await res.json();
        const box = document.getElementById('chatPhoneReveal');
        if (result.success) {
            box.innerHTML = `<i class="fas fa-phone-alt"></i> <strong>${result.phone}</strong> — <a href="tel:+91${result.phone}">Call</a> | <a href="https://wa.me/91${result.phone}" target="_blank">WhatsApp</a>`;
            box.classList.remove('hidden');
            document.getElementById('revealPhoneBtn').innerHTML = '<i class="fas fa-unlock"></i> Number Unlocked';
        } else {
            showToast('🔒 ' + result.error);
        }
    } catch { showToast('❌ Could not request phone reveal.'); }
}

// ─── Report ────────────────────────────────────────────────────────────────────
async function reportChat() {
    if (!activeChatId) return;
    const reason = prompt('Briefly describe the issue (spam, scam, abuse…):');
    if (!reason) return;
    try {
        const res = await fetch(`${CHAT_URL}/${activeChatId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ reason })
        });
        const result = await res.json();
        showToast(result.success ? '✅ Reported. Admin will review.' : '❌ ' + result.error);
    } catch { showToast('❌ Could not submit report.'); }
}

// ─── Rating Panel ──────────────────────────────────────────────────────────────
async function openRatePanel() {
    if (!activeChatId) return;
    const res = await fetch(`${CHAT_URL}/${activeChatId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const result = await res.json();
    if (!result.success) return;
    const chat = result.data;
    const me = getUser();
    const myId = me?.id || me?._id;

    const other = String(chat.buyerId?._id) === String(myId) ? chat.sellerId : chat.buyerId;

    // Build a quick star-rating overlay
    const overlay = document.createElement('div');
    overlay.className = 'rate-overlay';
    overlay.innerHTML = `
      <div class="rate-box">
        <h3>Rate <strong>${other.name}</strong></h3>
        <p>How was the deal?</p>
        <div class="star-row" id="starRow">
          ${[1, 2, 3, 4, 5].map(n => `<span class="star" data-v="${n}">★</span>`).join('')}
        </div>
        <p id="selectedScore" style="margin:0.5rem 0;color:#6366f1;font-weight:700"></p>
        <textarea id="rateComment" placeholder="Leave a comment (optional)" rows="3" style="width:100%;margin-bottom:1rem;padding:0.5rem;border-radius:6px;border:1px solid #ddd;"></textarea>
        <div style="display:flex;gap:0.75rem;">
          <button id="submitRateBtn" class="btn btn-primary" style="flex:1">Submit ⭐</button>
          <button id="cancelRateBtn" class="btn btn-secondary" style="flex:1">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    let selectedScore = 0;
    overlay.querySelectorAll('.star').forEach(s => {
        s.addEventListener('click', () => {
            selectedScore = +s.dataset.v;
            overlay.querySelectorAll('.star').forEach((x, i) => x.classList.toggle('active', i < selectedScore));
            document.getElementById('selectedScore').textContent = `${selectedScore} / 5`;
        });
    });

    document.getElementById('cancelRateBtn').addEventListener('click', () => overlay.remove());
    document.getElementById('submitRateBtn').addEventListener('click', async () => {
        if (!selectedScore) { showToast('Please select a star rating.'); return; }
        const comment = document.getElementById('rateComment').value;
        try {
            console.log('[Rate] submitting', { activeChatId, ratedUserId: other._id, score: selectedScore });
            const r = await fetch(`${BASE_URL}/api/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ chatId: activeChatId, ratedUserId: other._id, score: selectedScore, comment })
            });
            const rrText = await r.text();
            let rr;
            try { rr = JSON.parse(rrText); } catch { rr = { success: false, error: rrText }; }
            console.log('[Rate] response', { status: r.status, body: rr });
            overlay.remove();
            showToast(rr.success ? `⭐ Rating submitted! Thanks.` : `❌ ${rr.error || 'Rating failed'}`);
        } catch (err) {
            console.error('[Rate] submit error', err);
            showToast('❌ Could not submit rating. Check console for details.');
        }
    });
}

// ─── Sell Form ─────────────────────────────────────────────────────────────────
sellForm.addEventListener('submit', async e => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
        showToast('⚠️ Please login to post an item.');
        switchToTab('login');
        authModal.style.display = 'flex';
        return;
    }

    const fileInput = document.getElementById('image');
    let imageBase64 = '';
    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        imageBase64 = await new Promise(resolve => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    const itemData = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        price: Number(document.getElementById('price').value),
        condition: document.getElementById('condition').value,
        description: document.getElementById('description').value,
        seller_name: document.getElementById('seller_name').value,
        department: document.getElementById('department').value,
        year: document.getElementById('year').value,
        seller_phone: document.getElementById('seller_phone').value,
        seller_email: document.getElementById('seller_email').value,
        image: imageBase64
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(itemData) });
        const result = await res.json();
        if (result.success) {
            showToast('✅ Item posted successfully!');
            sellForm.reset();
            loadItems();
            document.querySelector('a[href="#browse"]').click();
        } else {
            if (res.status === 401) {
                showToast('⚠️ Session expired. Please login again.');
                localStorage.removeItem('token'); localStorage.removeItem('user');
                updateAuthUI(); switchToTab('login'); authModal.style.display = 'flex';
            } else { showToast('❌ ' + (result.error || 'Failed to post item')); }
        }
    } catch { showToast('❌ Error connecting to server.'); }
});

// ─── Search & Filters ──────────────────────────────────────────────────────────
function triggerSearch() {
    const filters = {};
    const activePill = document.querySelector('.pill.active');
    if (navSearchInput.value) filters.search = navSearchInput.value;
    if (activePill?.dataset.category) filters.category = activePill.dataset.category;
    loadItems(filters);
}

categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        triggerSearch();
    });
});

closeBtn.addEventListener('click', () => { itemModal.style.display = 'none'; });
navSearchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') { triggerSearch(); document.querySelector('#browse').scrollIntoView({ behavior: 'smooth' }); }
});

// ─── Hero Slider ───────────────────────────────────────────────────────────────
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slider .slide');
if (slides.length > 0) {
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

// ─── Scroll Car ────────────────────────────────────────────────────────────────
const scrollCarContainer = document.getElementById('scrollCarContainer');
const scrollCar = document.getElementById('scrollCar');
if (scrollCarContainer && scrollCar) {
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const cur = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) return;
        const pct = Math.max(0, Math.min(1, cur / maxScroll));
        scrollCarContainer.style.transform = `translateY(${pct * (window.innerHeight + 150)}px)`;
        scrollCar.style.transform = cur > lastScrollY ? 'rotate(180deg)' : 'rotate(0deg)';
        const heroH = document.getElementById('home')?.offsetHeight || 400;
        const road = document.getElementById('road');
        const show = cur > heroH - 150;
        scrollCarContainer.style.opacity = show ? '1' : '0';
        if (road) road.style.opacity = show ? '0.9' : '0';
        lastScrollY = cur;
    });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}