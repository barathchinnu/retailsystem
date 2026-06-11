const BASE_URL = 'https://retailsystem-1.onrender.com';
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

async function loadWishlist() {
  const token = getToken();
  if (!token) {
    wishlistMeta.textContent = 'Please login to view your wishlist.';
    wishlistGrid.innerHTML = '';
    return;
  }

  wishlistMeta.textContent = 'Loading...';
  try {
    const res = await fetch(API_WISHLIST_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json().catch(() => ({}));
    if (!result.success) {
      wishlistMeta.textContent = result.error || 'Could not load wishlist.';
      wishlistGrid.innerHTML = '';
      return;
    }

    const items = result.data || [];
    wishlistMeta.textContent = `${items.length} saved item${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
      wishlistGrid.innerHTML = '<div class="no-items">No wishlist items yet. Save something ❤️</div>';
      wishlistMeta.textContent = '0 saved item';
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
  } catch {
    wishlistMeta.textContent = 'Error loading wishlist.';
  }
}

async function toggleWishlist(itemId) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(API_WISHLIST_TOGGLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ itemId })
    });

    const result = await res.json().catch(() => ({}));
    if (!result.success) return;

    // if removed, reload
    await loadWishlist();
  } catch {
    // ignore
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

