const API_URL = 'http://localhost:5000/api/items';
const AUTH_URL = 'http://localhost:5000/api/auth';

// DOM Elements
const itemsGrid = document.getElementById('itemsGrid');
const sellForm = document.getElementById('sellForm');
const navSearchInput = document.getElementById('navSearchInput');
const navLocation = document.getElementById('navLocation');
const categoryPills = document.querySelectorAll('.pill');
const itemModal = document.getElementById('itemModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('#itemModal .close');

// Auth DOM Elements
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
function getUser() { 
    const u = localStorage.getItem('user'); 
    return u ? JSON.parse(u) : null; 
}

function updateAuthUI() {
    const user = getUser();
    const loggedOutEls = document.querySelectorAll('.auth-logged-out');
    const loggedInEls = document.querySelectorAll('.auth-logged-in');

    if (user) {
        loggedOutEls.forEach(el => el.style.display = 'none');
        loggedInEls.forEach(el => el.style.display = 'list-item');
        userGreeting.innerHTML = `<i class="fas fa-user-circle"></i> Hi, ${user.name.split(' ')[0]}`;
    } else {
        loggedOutEls.forEach(el => el.style.display = 'list-item');
        loggedInEls.forEach(el => el.style.display = 'none');
    }
}

// ─── Auth Modal Controls ───────────────────────────────────────────────────────

openLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchToTab('login');
    authModal.style.display = 'block';
});

openRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchToTab('register');
    authModal.style.display = 'block';
});

authModalClose.addEventListener('click', () => {
    authModal.style.display = 'none';
    clearAuthErrors();
});

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
        clearAuthErrors();
    }
    if (e.target === itemModal) {
        itemModal.style.display = 'none';
    }
});

function switchToTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
    clearAuthErrors();
}

loginTab.addEventListener('click', () => switchToTab('login'));
registerTab.addEventListener('click', () => switchToTab('register'));

function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
}

function clearAuthErrors() {
    loginError.classList.remove('show');
    registerError.classList.remove('show');
}

// ─── Login ─────────────────────────────────────────────────────────────────────

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();

        if (result.success) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            authModal.style.display = 'none';
            loginForm.reset();
            updateAuthUI();
            alert('✅ Login successful! Welcome back, ' + result.user.name);
        } else {
            showError(loginError, result.error);
        }
    } catch (err) {
        showError(loginError, 'Could not connect to server.');
    }
});

// ─── Register ──────────────────────────────────────────────────────────────────

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const department = document.getElementById('registerDept').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;

    // Client-side validations
    if (!email.toLowerCase().endsWith('@kongu.edu')) {
        showError(registerError, 'Only @kongu.edu email addresses are allowed.');
        return;
    }
    if (password !== confirm) {
        showError(registerError, 'Passwords do not match.');
        return;
    }

    try {
        const res = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, department })
        });
        const result = await res.json();

        if (result.success) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            authModal.style.display = 'none';
            registerForm.reset();
            updateAuthUI();
            alert('✅ Account created! Welcome, ' + result.user.name);
        } else {
            showError(registerError, result.error);
        }
    } catch (err) {
        showError(registerError, 'Could not connect to server.');
    }
});

// ─── Logout ────────────────────────────────────────────────────────────────────

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    alert('👋 Logged out successfully!');
});

// ─── Page Load & Cinematic Intro ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // ── Prevent hero-image flash: body hidden until intro ends ──────────────
    document.body.classList.add('intro-active');

    const intro         = document.getElementById('cinematic-intro');
    const introPreloader= document.getElementById('introPreloader');
    const introRing     = document.getElementById('introRing');
    const introLoadText = document.getElementById('introLoadText');
    const canvas        = document.getElementById('intro-canvas');

    // ── Spawn CSS stars ─────────────────────────────────────────────────────
    const starsEl = document.getElementById('introStars');
    if (starsEl) {
        for (let i = 0; i < 120; i++) {
            const s = document.createElement('span');
            const size = Math.random() * 2.5 + 0.5;
            s.style.cssText = [
                `width:${size}px`, `height:${size}px`,
                `top:${Math.random()*100}%`, `left:${Math.random()*100}%`,
                `--d:${(Math.random()*3+2).toFixed(1)}s`,
                `--delay:-${(Math.random()*5).toFixed(1)}s`
            ].join(';');
            starsEl.appendChild(s);
        }
    }

    if (intro) {

        // ── 0 s: Preloader + ring visible immediately ─────────────────────────

        // ── 2.2 s: 3D canvas fades in behind preloader ───────────────────────
        setTimeout(() => {
            if (canvas) canvas.classList.add('visible');
        }, 2200);

        // ── 3.5 s: Hide loading ring + text ──────────────────────────────────
        setTimeout(() => {
            if (introRing)     introRing.classList.add('hide');
            if (introLoadText) introLoadText.classList.add('hide');
        }, 3500);

        // ── 4 s: Fade out orbit preloader — 3D fully visible ─────────────────
        setTimeout(() => {
            if (introPreloader) introPreloader.classList.add('fade-out');
        }, 4000);

        // ── 5.5 s: CAMPUSSWAP logo assembles ─────────────────────────────────
        setTimeout(() => {
            intro.classList.add('hostel-scene-reveal-logo');
        }, 5500);

        // ── 7 s: Intro zooms out, site reveals ───────────────────────────────
        setTimeout(() => {

            intro.classList.add('hidden');

            setTimeout(() => {
                document.body.classList.remove('intro-active');
                document.body.classList.add('site-loaded');
                intro.remove();
            }, 1000);

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

        let url = API_URL;
        const params = new URLSearchParams(filters);
        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displayItems(result.data);
        } else {
            itemsGrid.innerHTML = '<div class="no-items">No items found. Be the first to post! 🎉</div>';
        }
    } catch (error) {
        itemsGrid.innerHTML = '<div class="no-items">Error loading items. Make sure the server is running.</div>';
        console.error('Error:', error);
    }
}

// ─── Display Items ─────────────────────────────────────────────────────────────

function displayItems(items) {
    itemsGrid.innerHTML = items.map(item => `
    <div class="item-card" data-id="${item._id}">
      <div class="item-image" ${item.image ? `style="background-image: url('${item.image}'); background-size: cover; background-position: center;"` : ''}>
        ${!item.image ? `<i class="fas fa-${getCategoryIcon(item.category)}"></i>` : ''}
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
    </div>
  `).join('');

    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => showModal(card.dataset.id));
    });

    // Setup 3D Scroll Animations for Cards
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay based on index
                setTimeout(() => {
                    entry.target.classList.add('show');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.item-card').forEach(card => {
        observer.observe(card);
    });
}

function getCategoryIcon(category) {
    const icons = {
        books: 'book',
        electronics: 'laptop',
        furniture: 'chair',
        lab_equipment: 'flask',
        bags: 'shopping-bag',
        sports: 'football',
        other: 'box'
    };
    return icons[category] || 'box';
}

function truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// ─── Show Item Modal ───────────────────────────────────────────────────────────

async function showModal(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();

        if (result.success) {
            const item = result.data;
            modalBody.innerHTML = `
        <h2>${item.title}</h2>
        ${item.image ? `<img src="${item.image}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 5px; margin-top: 1rem;">` : ''}
        <div class="modal-item-price">₹${item.price}</div>
        <p><strong>Category:</strong> ${item.category.replace('_', ' ')}</p>
        <p><strong>Condition:</strong> ${item.condition.replace('_', ' ')}</p>
        <p><strong>Description:</strong></p>
        <p>${item.description}</p>
        <div class="modal-seller-info">
          <p><strong>Seller:</strong> ${item.seller_name}</p>
          <p><strong>Department:</strong> ${item.department}</p>
          <p><strong>Year:</strong> ${item.year}</p>
          <p><strong>Phone:</strong> ${item.seller_phone}</p>
          <p><strong>Email:</strong> ${item.seller_email}</p>
        </div>
        <a href="tel:+91${item.seller_phone}" target="_blank" class="modal-contact-btn">
          <i class="fas fa-phone"></i> Call Seller
        </a>
        <a href="mailto:${item.seller_email}" target="_blank" class="modal-contact-btn" style="background: #3498db; margin-top: 0.5rem;">
          <i class="fas fa-envelope"></i> Email Seller
        </a>
      `;
            itemModal.style.display = 'block';
        }
    } catch (error) {
        alert('Error loading item details');
    }
}

// ─── Sell Form (PROTECTED) ─────────────────────────────────────────────────────

sellForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
        alert('⚠️ You must be logged in to post an item.');
        switchToTab('login');
        authModal.style.display = 'block';
        return;
    }

    const fileInput = document.getElementById('image');
    let imageBase64 = '';
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        imageBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(itemData)
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Item posted successfully!');
            sellForm.reset();
            loadItems();
            document.querySelector('a[href="#browse"]').click();
        } else {
            if (response.status === 401) {
                alert('⚠️ Session expired. Please login again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                updateAuthUI();
                switchToTab('login');
                authModal.style.display = 'block';
            } else {
                alert('❌ Error: ' + (result.error || 'Failed to post item'));
            }
        }
    } catch (error) {
        alert('❌ Error connecting to server. Make sure the backend is running.');
    }
});

// ─── Search & Filters ──────────────────────────────────────────────────────────

function triggerSearch() {
    const filters = {};
    if (navSearchInput.value) filters.search = navSearchInput.value;
    
    const activePill = document.querySelector('.pill.active');
    if (activePill && activePill.dataset.category) {
        filters.category = activePill.dataset.category;
    }

    loadItems(filters);
}

categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        triggerSearch();
    });
});

// Close item modal
closeBtn.addEventListener('click', () => {
    itemModal.style.display = 'none';
});

// Search on Enter key
navSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        triggerSearch();
        document.querySelector('#browse').scrollIntoView({ behavior: 'smooth' });
    }
});

// Hero Background Slider
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slider .slide');

if (slides.length > 0) {
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

// ─── 3D Scrolling Car ──────────────────────────────────────────────────────────
const scrollCarContainer = document.getElementById('scrollCarContainer');
const scrollCar = document.getElementById('scrollCar');

if (scrollCarContainer && scrollCar) {
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        
        if (maxScroll <= 0) return; // Not enough content to scroll

        // Calculate scroll percentage (0 to 1)
        let scrollPercent = currentScrollY / maxScroll;
        // Clamp it
        scrollPercent = Math.max(0, Math.min(1, scrollPercent));

        // Move the car vertically. Match the offset from CSS top: -200px
        const startY = 0; 
        const endY = window.innerHeight + 150;
        const translateY = scrollPercent * (endY - startY);

        scrollCarContainer.style.transform = `translateY(${translateY}px)`;

        // Determine direction and rotate
        if (currentScrollY > lastScrollY) {
            // Scrolling down
            scrollCar.style.transform = 'rotate(180deg)';
        } else if (currentScrollY < lastScrollY) {
            // Scrolling up
            scrollCar.style.transform = 'rotate(0deg)';
        }

        // Hide road and car when in the hero section
        const heroSection = document.getElementById('home');
        const showThreshold = heroSection ? heroSection.offsetHeight - 150 : 400;
        const road = document.getElementById('road');

        if (currentScrollY > showThreshold) {
            scrollCarContainer.style.opacity = '1';
            if (road) road.style.opacity = '0.9';
        } else {
            scrollCarContainer.style.opacity = '0';
            if (road) road.style.opacity = '0';
        }

        lastScrollY = currentScrollY;
    });
}