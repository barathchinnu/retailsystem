const BASE_URL = 'https://retailsystem-1.onrender.com'; // change if needed
const API_WISHLIST_URL = `${BASE_URL}/api/wishlist`;
const API_WISHLIST_TOGGLE_URL = `${BASE_URL}/api/wishlist/toggle`;

function getToken() {
  return localStorage.getItem('token');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

const wishlistGrid = document.getElementById('wishlistGrid');
const wishlistMeta = document.getElementById('wishlistMeta');

function renderStatus(type, msg) {
  // type: loading | error | empty | success
  const safe = msg == null ? '' : String(msg);

  if (!wishlistGrid) return;

  if (type === 'loading') {
    wishlistMeta && (wishlistMeta.textContent = safe || 'Loading...');
    wishlistGrid.innerHTML = '<div class="no-items">Loading wishlist…</div>';
    return;
  }

  if (type === 'error') {
    wishlistMeta && (wishlistMeta.textContent = safe || 'Error');
    wishlistGrid.innerHTML = `
      <div class="no-items" style="padding:2rem 1rem; max-width:720px; margin:0 auto;">
        <div style="font-size:1.1rem; font-weight:800; color:#111827; margin-bottom:.6rem;">Could not load wishlist</div>
        <div style="color:#6b7280; margin-bottom:1rem;">${escapeHtml(safe || 'Please try again later.')}</div>
        <div style="display:flex; gap:.7rem; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primary" id="wishlistRetryBtn" style="background:#6366f1;color:#fff;border:none;border-radius:10px;padding:.7rem 1.2rem;cursor:pointer;">Retry</button>
        </div>
      </div>
    `;

    document.getElementById('wishlistRetryBtn')?.addEventListener('click', () => {
      loadWishlist();
    });

    return;
  }

  if (type === 'empty') {
    wishlistMeta && (wishlistMeta.textContent = safe || '0 saved items');
    wishlistGrid.innerHTML = '<div class="no-items">No wishlist items yet. Save something ❤️</div>';
    return;
  }

  // success
  wishlistMeta && (wishlistMeta.textContent = safe || '');
}

async function fetchJsonWithFallback(urls, options) {
  let lastErr = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      const text = await res.text().catch(() => '');

      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (res.ok) {
        return data ?? { success: false, error: text || `HTTP ${res.status}` };
      }

      lastErr = data?.error || data || { success: false, error: `HTTP ${res.status}` };
    } catch (e) {
      lastErr = e;
    }
  }

  return lastErr;
}

async function requestWishlist() {
  const token = getToken();
  if (!token) return { success: false, error: 'Please login to view your wishlist.' };

  const urls = [
    API_WISHLIST_URL,
    // fallback: same-origin
    '/api/wishlist'
  ];

  return fetchJsonWithFallback(urls, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function requestToggle(itemId) {
  const token = getToken();
  if (!token) return { success: false, error: 'Please login first.' };

  const urls = [
    API_WISHLIST_TOGGLE_URL,
    // fallback: same-origin
    '/api/wishlist/toggle'
  ];

  return fetchJsonWithFallback(urls, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ itemId })
  });
}

async function loadWishlist() {
  const token = getToken();
  if (!token) {
    renderStatus('error', 'Please login to view your wishlist.');
    wishlistGrid.innerHTML = '';
    return;
  }

  renderStatus('loading', 'Loading wishlist…');

  try {
    const result = await requestWishlist();

    if (!result || result.success === false) {
      const err = result?.error || 'Could not load wishlist.';
      renderStatus('error', err);
      return;
    }

    const items = result.data || [];
    wishlistMeta.textContent = `${items.length} saved item${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
      renderStatus('empty', '0 saved item');
      return;
    }

    wishlistGrid.innerHTML = items
      .map((item) => {
        const img = item.image
          ? `background-image:url('${item.image}');background-size:cover;background-position:center;`
          : '';

        return `
          <div class="item-card" data-id="${item._id}">
            <div class="item-image" style="${img}">
              ${!item.image ? `<i class="fas fa-box"></i>` : ''}
            </div>
            <div class="item-content">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                <div>
                  <div class="item-title">${escapeHtml(item.title)}</div>
                  <div class="item-description">${escapeHtml(item.description || '').slice(0, 80)}${(item.description || '').length > 80 ? '...' : ''}</div>
                </div>
                <button class="wishlist-btn" data-toggle="${item._id}" title="Remove from wishlist" style="border:none;background:transparent;cursor:pointer;">
                  <i class="fas fa-heart" style="color:#ef4444;font-size:1.25rem;"></i>
                </button>
              </div>

              <div class="item-meta" style="margin-top:0.8rem;">
                <div class="item-price">₹${item.price}</div>
                <div class="item-condition">${escapeHtml(String(item.condition || '')).replace('_', ' ')}</div>
              </div>

              <div class="item-seller"><i class="fas fa-user"></i> ${escapeHtml(item.seller_name)} • ${escapeHtml(item.department)}</div>
              <div class="item-category">${escapeHtml(String(item.category || '')).replace('_', ' ')}</div>
            </div>
          </div>
        `;
      })
      .join('');

    document.querySelectorAll('.wishlist-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.getAttribute('data-toggle');
        toggleWishlist(itemId);
      });
    });
  } catch (e) {
    const msg = e?.message || 'Error loading wishlist.';
    renderStatus('error', msg);
  }
}

async function toggleWishlist(itemId) {
  if (!itemId) return;

  const token = getToken();
  if (!token) return;

  // optimistic: disable button(s) briefly
  try {
    const result = await requestToggle(itemId);
    if (!result || result.success === false) {
      const err = result?.error || 'Could not update wishlist.';
      renderStatus('error', err);
      return;
    }

    await loadWishlist();
  } catch (e) {
    renderStatus('error', e?.message || 'Could not update wishlist.');
  }
}

// logout
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});

window.addEventListener('DOMContentLoaded', () => {
  loadWishlist();
});

