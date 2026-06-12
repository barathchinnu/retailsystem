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
        // Nav DP (base64)
        const navImg = document.getElementById('navProfileImage');
        const navIcon = document.getElementById('navProfileIcon');
        const pi = user.profileImage;
        if (navImg) {
            if (pi) {
                navImg.src = pi;
                navImg.style.display = 'block';
                navIcon && (navIcon.style.display = 'none');
            } else {
                navImg.src = '';
                navImg.style.display = 'none';
                navIcon && (navIcon.style.display = 'block');
            }
        }
        // Update greeting text + badge, but keep the DP/icon layout stable
        const nameFirst = user.name.split(' ')[0];
        const iconHtml = navIcon ? navIcon.outerHTML : '<i class="fas fa-user-circle" id="navProfileIcon"></i>';
        const imgHtml = navImg ? navImg.outerHTML : '';
        userGreeting.innerHTML = `${imgHtml || iconHtml} Hi, ${nameFirst}${badge}`;

        // Re-bind DP click after greeting HTML is re-rendered
        const dp = document.getElementById('navProfileImage');
        if (dp && dp.src) {
            dp.style.cursor = 'pointer';
            dp.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openDpPreview(dp.src);
            };
        }
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

            // Ensure profileImage is always present after login
            try {
                const meRes = await fetch(`${BASE_URL}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${result.token}` }
                });
                const meJson = await meRes.json().catch(() => ({}));
                if (meRes.ok && meJson?.success && meJson?.data) {
                    const merged = { ...result.user, ...meJson.data };
                    localStorage.setItem('user', JSON.stringify(merged));
                }
            } catch {
                // ignore; UI will fallback to whatever is in result.user
            }

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

// ─── Profile Modal ─────────────────────────────────────────────────────────
const profileModal = document.getElementById('profileModal');
const profileModalClose = document.getElementById('profileModalClose');
const profileCancelBtn = document.getElementById('profileCancelBtn');
const profileSaveBtn = document.getElementById('profileSaveBtn');
const profileError = document.getElementById('profileError');
const editProfileBtn = document.getElementById('editProfileBtn');

if (editProfileBtn) {
    editProfileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!getToken()) { showToast('⚠️ Please login first.'); return; }
        try {
            const res = await fetch(`${BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const result = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
            if (!result.success) { showToast(result.error || 'Failed to load profile'); return; }

            document.getElementById('profileName').value = result.data.name || '';
            document.getElementById('profileDepartment').value = result.data.department || '';

            const img = document.getElementById('profileImagePreview');
            const placeholder = document.getElementById('profileImagePlaceholder');
            const pi = result.data.profileImage;
            if (img) {
                if (pi) {
                    img.src = pi;
                    img.style.display = 'block';
                    placeholder && (placeholder.style.display = 'none');
                } else {
                    img.src = '';
                    img.style.display = 'none';
                    placeholder && (placeholder.style.display = 'block');
                }
            }

            // reset file picker
            const fileInput = document.getElementById('profileImageInput');
            if (fileInput) fileInput.value = '';

            profileError.style.display = 'none';
            profileModal.style.display = 'block';
        } catch {
            showToast('❌ Could not load profile.');
        }
    });
}

function setProfileError(msg) {
    if (!profileError) return;
    profileError.textContent = msg;
    profileError.style.display = 'block';
}

profileModalClose?.addEventListener('click', () => { profileModal.style.display = 'none'; profileError?.style && (profileError.style.display = 'none'); });
profileCancelBtn?.addEventListener('click', () => { profileModal.style.display = 'none'; profileError && (profileError.style.display = 'none'); });

const profileImageInput = document.getElementById('profileImageInput');
profileImageInput?.addEventListener('change', () => {
    const file = profileImageInput.files?.[0];
    const img = document.getElementById('profileImagePreview');
    const placeholder = document.getElementById('profileImagePlaceholder');
    if (!img) return;

    if (!file) {
        img.src = '';
        img.style.display = 'none';
        placeholder && (placeholder.style.display = 'block');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        img.src = String(reader.result || '');
        img.style.display = 'block';
        placeholder && (placeholder.style.display = 'none');
    };
    reader.readAsDataURL(file);
});

profileSaveBtn?.addEventListener('click', async () => {
    const token = getToken();
    if (!token) return;

    try {
        const name = document.getElementById('profileName').value.trim();
        const department = document.getElementById('profileDepartment').value.trim();

        const fileInput = document.getElementById('profileImageInput');
        let profileImage;
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.size > 2_700_000) {
                setProfileError('Profile image is too large (max ~2.5MB).');
                return;
            }
            const reader = new FileReader();
            profileImage = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        const body = { name, department };
        if (profileImage !== undefined) body.profileImage = profileImage;

        const res = await fetch(`${BASE_URL}/api/users/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });

        const result = await res.json();
        if (!result.success) {
            setProfileError(result.error || 'Failed to save profile');
            return;
        }

        // refresh localStorage user
        const updated = result.data;
        const curUser = getUser();
        const merged = { ...curUser, ...updated };
        localStorage.setItem('user', JSON.stringify(merged));
        updateAuthUI();
        profileModal.style.display = 'none';
        showToast('✅ Profile updated');
    } catch {
        setProfileError('❌ Could not update profile.');
    }
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

// ─── Profile DP Preview (tap to view) ─────────────────────────────────────────
const dpPreviewModalId = 'dpPreviewModal';
function ensureDpPreviewModal() {
    let modal = document.getElementById(dpPreviewModalId);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = dpPreviewModalId;
    modal.className = 'modal dp-preview-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <span class="close" id="dpPreviewClose" style="cursor:pointer;">&times;</span>
            <div style="display:flex;justify-content:center;">
                <img id="dpPreviewImage" alt="Profile picture" style="max-width:100%;max-height:70vh;border-radius:16px;object-fit:contain;" />
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.getElementById('dpPreviewClose')?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    return modal;
}

function openDpPreview(src) {
    const modal = ensureDpPreviewModal();
    const img = document.getElementById('dpPreviewImage');
    if (!img) return;
    img.src = src || '';
    modal.style.display = 'block';
}

// bind on first render + after auth updates
// (dp image src is set inside updateAuthUI)


function autoBindDpPreview() {
    const dp = document.getElementById('navProfileImage');
    if (!dp) return;

    // Make it clickable when DP exists
    dp.style.cursor = 'pointer';
    dp.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dp.src) return;
        openDpPreview(dp.src);
    });
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
    // load wishlist heart states after items are rendered
    // (syncWishlistHearts is called again after toggle)
});

// initial sync after items first load
(async function initWishlistHeartsOnce() {
    // wait a bit for loadItems() -> displayItems() to create heart buttons
    setTimeout(() => {
        syncWishlistHearts();
    }, 800);
})();

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
        <button class="wishlist-toggle" data-itemid="${item._id}" title="Save to wishlist" style="position:absolute;top:10px;left:10px;border:none;background:rgba(255,255,255,0.85);backdrop-filter:blur(6px);border-radius:999px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;">
          <i class="fas fa-heart" aria-hidden="true" style="color:#ef4444;"></i>
        </button>
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

    // Wishlist toggle (heart button inside card)
    document.querySelectorAll('.wishlist-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const token = getToken();
            if (!token) {
                authModal.style.display = 'flex';
                switchToTab('login');
                showToast('⚠️ Please login to save items.');
                return;
            }

            const itemId = btn.getAttribute('data-itemid');
            try {
                const res = await fetch(`${BASE_URL}/api/wishlist/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ itemId })
                });

                const text = await res.text().catch(() => '');
                let result;
                try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }

                if (!res.ok || result.success === false) {
                    showToast(result.error || `Could not update wishlist (HTTP ${res.status})`);
                    return;
                }


                showToast(result.saved ? '❤️ Saved to wishlist' : 'Removed from wishlist');
                await syncWishlistHearts();
            } catch {
                showToast('❌ Wishlist action failed');
            }
        });
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

        const sellerActionsHtml = isOwnItem
            ? `
              <div class="seller-actions" style="margin-top:1rem; display:flex; gap:0.6rem; flex-wrap:wrap;">
                <button class="btn btn-ghost" id="sellerEditBtn" style="border:1px solid #e5e7eb; background:#fff;">✏️ Edit</button>
                <button class="btn btn-ghost" id="sellerToggleSoldBtn" style="border:1px solid #e5e7eb; background:#fff;">${item.isSold ? '✅ Mark as Available' : '🔥 Mark as Sold'}</button>

                <div style="width:100%;font-weight:800;color:#111827;opacity:.9;text-align:center;margin-top:6px;">Status: ${item.isSold ? 'SOLD' : 'LISTED'}</div>

                <button class="btn btn-danger" id="sellerDeleteBtn" style="background:#ef4444; color:#fff; border:none;">🗑️ Delete</button>
              </div>
              <div id="sellerEditForm" style="display:none; margin-top:1rem;">
                <div class="form-group"><label>Title</label><input id="editTitle" type="text" value="${escapeHtml(item.title)}"></div>
                <div class="form-group" style="margin-top:0.5rem"><label>Price (₹)</label><input id="editPrice" type="number" value="${item.price}" min="0"></div>
                <div class="form-group" style="margin-top:0.5rem"><label>Condition</label>
                  <select id="editCondition">
                    ${['new','like_new','good','fair'].map(c=>`<option value="${c}" ${item.condition===c?'selected':''}>${c.replace('_',' ')}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-top:0.5rem"><label>Category</label>
                  <select id="editCategory">
                    ${['books','electronics','furniture','lab_equipment','bags','sports','other'].map(cat=>`<option value="${cat}" ${item.category===cat?'selected':''}>${cat.replace('_',' ')}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-top:0.5rem"><label>Year</label><input id="editYear" type="text" value="${escapeHtml(item.year)}"></div>
                <div class="form-group" style="margin-top:0.5rem"><label>Description</label><textarea id="editDescription" rows="3">${escapeHtml(item.description)}</textarea></div>
                <div style="margin-top:0.6rem; display:flex; gap:0.6rem;">
                  <button class="btn btn-primary" id="sellerSaveBtn" style="flex:1; background:#6366f1; color:#fff;">Save</button>
                  <button class="btn btn-ghost" id="sellerCancelBtn" style="flex:1; border:1px solid #e5e7eb; background:#fff;">Cancel</button>
                </div>
              </div>
            `
            : '';

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
          ${sellerActionsHtml}
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

        // Seller actions (edit / toggle sold / delete)
        if (isOwnItem) {
            const sellerEditBtn = modalBody.querySelector('#sellerEditBtn');
            const sellerToggleSoldBtn = modalBody.querySelector('#sellerToggleSoldBtn');
            const sellerDeleteBtn = modalBody.querySelector('#sellerDeleteBtn');

            const sellerEditForm = modalBody.querySelector('#sellerEditForm');
            const sellerSaveBtn = modalBody.querySelector('#sellerSaveBtn');
            const sellerCancelBtn = modalBody.querySelector('#sellerCancelBtn');

            sellerEditBtn?.addEventListener('click', () => {
                const isOpen = sellerEditForm.style.display !== 'none';
                sellerEditForm.style.display = isOpen ? 'none' : 'block';
            });

            sellerCancelBtn?.addEventListener('click', () => {
                sellerEditForm.style.display = 'none';
            });

            sellerToggleSoldBtn?.addEventListener('click', async () => {
                const token = getToken();
                if (!token) {
                    showToast('⚠️ Please login.');
                    switchToTab('login');
                    authModal.style.display = 'flex';
                    return;
                }
                try {
                    const res = await fetch(`${API_URL}/${item._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ isSold: !item.isSold })
                    });
                    const result = await res.json();
                    if (!result.success && !result.data) {
                        // backend currently returns {success:true,data}
                    }
                    if (!res.ok || (result.success === false)) {
                        showToast(`❌ ${result.error || 'Failed to update sold status'}`);
                        return;
                    }
                    showToast('✅ Status updated');
                    item.isSold = !item.isSold;
                    if (item.isSold) {
                        addNotification('sold', 'Item Sold', `Your item ${item.title} was marked as sold.`);
                    }
                    await showItemModal(item._id);
                } catch {
                    showToast('❌ Could not update status');
                }
            });

            sellerDeleteBtn?.addEventListener('click', async () => {
                const token = getToken();
                if (!token) {
                    showToast('⚠️ Please login.');
                    switchToTab('login');
                    authModal.style.display = 'flex';
                    return;
                }
                const ok = confirm('Delete this listing?');
                if (!ok) return;
                try {
                    const res = await fetch(`${API_URL}/${item._id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        // surface server message for easier debugging
                        showToast(`❌ ${result.error || `Delete failed (HTTP ${res.status})`}`);
                        return;
                    }
                    showToast('🗑️ Deleted');
                    itemModal.style.display = 'none';
                    await loadItems();
                } catch {
                    showToast('❌ Delete failed');
                }
            });

            sellerSaveBtn?.addEventListener('click', async () => {
                const token = getToken();
                if (!token) {
                    showToast('⚠️ Please login.');
                    return;
                }

                const payload = {
                    title: document.getElementById('editTitle')?.value,
                    price: Number(document.getElementById('editPrice')?.value),
                    condition: document.getElementById('editCondition')?.value,
                    category: document.getElementById('editCategory')?.value,
                    year: document.getElementById('editYear')?.value,
                    description: document.getElementById('editDescription')?.value
                };

                try {
                    const res = await fetch(`${API_URL}/${item._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                    const result = await res.json();
                    if (!res.ok || result.success === false) {
                        showToast(`❌ ${result.error || 'Update failed'}`);
                        return;
                    }
                    showToast('✅ Listing updated');
                    sellerEditForm.style.display = 'none';
                    await showItemModal(item._id);
                } catch {
                    showToast('❌ Update failed');
                }
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

let chatPollTimer = null;
let chatLastSeenCount = 0;

function stopChatPolling() {
    if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
    }
}

function startChatPolling() {
    stopChatPolling();

    const panel = document.getElementById('chatPanel');
    if (!panel) return;

    // set initial count based on current DOM
    chatLastSeenCount = document.getElementById('chatMessages')?.querySelectorAll('.chat-msg')?.length ?? 0;

    chatPollTimer = setInterval(async () => {
        if (!activeChatId) return;
        if (!panel.classList.contains('open')) return;

        try {
            const res = await fetch(`${CHAT_URL}/${activeChatId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await res.json();
            if (!result.success) return;

            const newCount = result.data?.messages?.length ?? 0;
            if (newCount !== chatLastSeenCount) {
                if (newCount > chatLastSeenCount) {
                    const latestMsg = result.data.messages[newCount - 1];
                    const me = getUser();
                    const myId = me?.id || me?._id;
                    if (String(latestMsg.senderId) !== String(myId)) {
                        addNotification('msg', 'New Message', `Message from ${latestMsg.senderName}`);
                    }
                }
                chatLastSeenCount = newCount;
                await loadChatMessages(activeChatId);
            }
        } catch {
            // ignore poll errors
        }
    }, 2000);
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

    startChatPolling();


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
        <input type="file" id="chatImageInput" accept="image/*" style="display:none" />
        <button id="chatImageBtn" class="chat-action-btn" type="button" title="Upload image to send" style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-image"></i>
        </button>
        <input type="text" id="chatInput" placeholder="Type a message…" maxlength="500">
        <button id="chatSendBtn"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;
    document.body.appendChild(panel);
    window.openExistingChat = openExistingChat;

    document.getElementById('closeChatBtn').addEventListener('click', () => {
        panel.classList.remove('open');
        activeChatId = null;
        stopChatPolling();
    });
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    // Image upload in chat
    const chatImageInput = document.getElementById('chatImageInput');
    const chatImageBtn = document.getElementById('chatImageBtn');
    chatImageBtn?.addEventListener('click', () => chatImageInput?.click());
    chatImageInput?.addEventListener('change', () => {
        const file = chatImageInput.files?.[0];
        if (!file) return;
        sendImageMessage(file);
        chatImageInput.value = '';
    });
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
                  ${m.image ? `<span class="msg-image"><img src="${m.image}" style="max-width:240px;max-height:180px;border-radius:12px;display:block;"/></span>` : ''}
                  ${m.text ? `<span class="msg-text">${escapeHtml(m.text)}</span>` : ''}
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
            addNotification('unlock', 'Number Unlocked', `You have unlocked the seller's phone number.`);
        } else {
            showToast('🔒 ' + result.error);
        }
    } catch { showToast('❌ Could not request phone reveal.'); }
}

async function sendImageMessage(file) {
    if (!activeChatId) return;
    try {
        const token = getToken();
        if (!token) { showToast('⚠️ Please login.'); return; }

        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const res = await fetch(`${CHAT_URL}/${activeChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ image: base64 })
        });

        const result = await res.json();
        if (result.success) await loadChatMessages(activeChatId);
        else showToast('❌ ' + result.error);
    } catch {
        showToast('❌ Image message failed to send.');
    }
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

    // Load chat (backend will reject if item is not marked SOLD)
    const res = await fetch(`${CHAT_URL}/${activeChatId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const result = await res.json();
    if (!result.success) return;
    const chat = result.data;

    // Gate UI until deal completion
    const itemId = chat?.itemId?._id || chat?.itemId;
    if (!itemId) {
        showToast('⚠️ Could not determine deal completion status.');
        return;
    }

    const itemRes = await fetch(`${API_URL}/${itemId}`);
    const itemJson = await itemRes.json().catch(() => ({}));
    if (!itemJson?.success) {
        showToast('⚠️ Could not verify deal completion.');
        return;
    }

    if (!itemJson.data?.isSold) {
        showToast('🔒 Deal not completed yet. Mark the item as SOLD to unlock ratings.');
        return;
    }

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
            if (rr.success) {
                addNotification('star', 'Rating Submitted', `You rated ${other.name} ${selectedScore} stars.`);
            }
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

// sync wishlist heart button states (called after toggle/login)
async function syncWishlistHearts() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${BASE_URL}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
        const result = await res.json().catch(() => ({}));
        if (!result.success) return;

        const savedIds = new Set((result.data || []).map(i => String(i._id)));

        document.querySelectorAll('.wishlist-toggle').forEach(btn => {
            const id = btn.getAttribute('data-itemid');
            const icon = btn.querySelector('i.fas.fa-heart');
            const isSaved = savedIds.has(String(id));
            if (icon) {
                icon.style.opacity = isSaved ? '1' : '0.35';
            }
        });
} catch {
        // ignore
    }
}

// ─── Notifications ─────────────────────────────────────────────────────────────
let notifications = [];

function loadNotifications() {
    const user = getUser();
    if (!user) return;
    try {
        const saved = localStorage.getItem(`notifications_${user.id || user._id}`);
        notifications = saved ? JSON.parse(saved) : [];
    } catch {
        notifications = [];
    }
    renderNotifications();
}

function saveNotifications() {
    const user = getUser();
    if (!user) return;
    localStorage.setItem(`notifications_${user.id || user._id}`, JSON.stringify(notifications));
    renderNotifications();
}

function addNotification(type, title, desc) {
    const user = getUser();
    if (!user) return; // Only notify logged in users
    notifications.unshift({
        id: Date.now().toString(),
        type,
        title,
        desc,
        time: new Date().toISOString(),
        read: false
    });
    
    // Keep max 20 notifications
    if (notifications.length > 20) notifications.pop();
    
    saveNotifications();
    showToast(`🔔 ${title}`);
}

function renderNotifications() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationsList');
    if (!badge || !list) return;

    const unreadCount = notifications.filter(n => !n.read).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    if (notifications.length === 0) {
        list.innerHTML = '<div class="no-notifications">No new notifications</div>';
        return;
    }

    list.innerHTML = notifications.map(n => {
        let iconHtml = '';
        if (n.type === 'msg') iconHtml = '<i class="fas fa-envelope"></i>';
        else if (n.type === 'unlock') iconHtml = '<i class="fas fa-unlock"></i>';
        else if (n.type === 'sold') iconHtml = '<i class="fas fa-check-circle"></i>';
        else if (n.type === 'star') iconHtml = '<i class="fas fa-star"></i>';
        else iconHtml = '<i class="fas fa-bell"></i>';

        return `
            <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                <div class="notification-icon ${n.type}">
                    ${iconHtml}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(n.title)}</div>
                    <div class="notification-desc">${escapeHtml(n.desc)}</div>
                    <div class="notification-time">${formatTime(n.time)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Attach mark as read events
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const notif = notifications.find(n => n.id === id);
            if (notif && !notif.read) {
                notif.read = true;
                saveNotifications();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const notifBtn = document.getElementById('notificationsBtn');
    const notifDrop = document.getElementById('notificationsDropdown');
    const clearBtn = document.getElementById('clearNotificationsBtn');

    if (notifBtn && notifDrop) {
        notifBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = notifDrop.style.display === 'block';
            notifDrop.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                // Mark all as read when opening dropdown
                let updated = false;
                notifications.forEach(n => {
                    if (!n.read) { n.read = true; updated = true; }
                });
                if (updated) saveNotifications();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notifBtn.contains(e.target) && !notifDrop.contains(e.target)) {
                notifDrop.style.display = 'none';
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            notifications = [];
            saveNotifications();
            if (notifDrop) notifDrop.style.display = 'none';
        });
    }

    // load notifications initially
    setTimeout(loadNotifications, 500); // slight delay to ensure user is loaded
});

// Update auth UI hook to load notifications on login
const originalUpdateAuthUI = updateAuthUI;
updateAuthUI = function() {
    originalUpdateAuthUI();
    if (getUser()) {
        loadNotifications();
    } else {
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.style.display = 'none';
    }
};

