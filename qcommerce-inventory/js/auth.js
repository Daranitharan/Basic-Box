// ============================================================
//  auth.js  –  Registration, Login, Logout & Page Guard
//
//  • When Supabase is configured → uses Supabase Auth
//  • When not configured        → falls back to localStorage
// ============================================================

const USERS_KEY = 'qcommerce-users';
const AUTH_KEY  = 'qcommerce-user';

// ── localStorage helpers (fallback) ─────────────────────────
function getUsers() { return Storage.get(USERS_KEY) || []; }
function saveUsers(users) { Storage.set(USERS_KEY, users); }

// ── Registration ────────────────────────────────────────────
async function registerUser(name, email, password) {
    const sb = getSupabase();

    if (sb) {
        // Supabase Auth sign-up
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });

        if (error) return { ok: false, error: error.message };

        // Profile row is created automatically by the DB trigger.
        // Store a lightweight session object in localStorage so
        // getCurrentUser() works on every page without an async call.
        const user = { id: data.user.id, name, email };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return { ok: true, user };
    }

    // ── localStorage fallback ──
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        password   // NOTE: stored plain-text in localStorage (dev only)
    };
    users.push(user);
    saveUsers(users);
    return { ok: true, user };
}

// ── Login ────────────────────────────────────────────────────
async function loginUser(email, password) {
    const sb = getSupabase();

    if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) return { ok: false, error: 'Invalid email or password.' };

        const name = data.user.user_metadata?.name || email.split('@')[0];
        const user = { id: data.user.id, name, email };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return { ok: true, user };
    }

    // ── localStorage fallback ──
    const users = getUsers();
    const user = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );
    if (!user) return { ok: false, error: 'Invalid email or password.' };

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { ok: true, user };
}

// ── Session ──────────────────────────────────────────────────
function getCurrentUser() {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
}

async function logoutUser() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem(AUTH_KEY);
    window.location.href = loginPageUrl();
}

// ── URL helper ───────────────────────────────────────────────
function loginPageUrl() {
    const path = window.location.pathname.replace(/\\/g, '/');

    if (path.endsWith('/login.html'))                  return 'login.html';
    if (path.includes('/qcommerce-inventory/pages/')) return '../../login.html';
    if (path.includes('/qcommerce-inventory/'))        return '../login.html';
    return 'login.html';
}

// ── Guard + UI bindings ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthPage = document.body.classList.contains('auth-page');

    // If Supabase is configured, verify the session server-side
    const sb = getSupabase();
    if (sb && !isAuthPage) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            localStorage.removeItem(AUTH_KEY);
            window.location.href = loginPageUrl();
            return;
        }
        // Refresh local cache if needed
        if (!localStorage.getItem(AUTH_KEY)) {
            const name = user.user_metadata?.name || user.email.split('@')[0];
            localStorage.setItem(AUTH_KEY, JSON.stringify({ id: user.id, name, email: user.email }));
        }
    } else if (!isAuthPage && !getCurrentUser()) {
        // localStorage fallback guard
        window.location.href = loginPageUrl();
        return;
    }

    // Inject logout confirmation modal into page (once)
    if (!isAuthPage && !document.getElementById('logoutOverlay')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="logout-overlay" id="logoutOverlay" role="dialog" aria-modal="true" aria-labelledby="logoutDialogTitle">
                <div class="logout-dialog">
                    <div class="logout-dialog-icon">
                        <i class="fas fa-sign-out-alt"></i>
                    </div>
                    <h3 id="logoutDialogTitle">Logout?</h3>
                    <p>Are you sure you want to log out of your Basics Box account?</p>
                    <div class="logout-dialog-actions">
                        <button class="btn btn-secondary" id="logoutCancelBtn">Cancel</button>
                        <button class="btn btn-danger" id="logoutConfirmBtn">
                            <i class="fas fa-sign-out-alt"></i> Yes, Logout
                        </button>
                    </div>
                </div>
            </div>
        `);

        document.getElementById('logoutCancelBtn').addEventListener('click', () => {
            document.getElementById('logoutOverlay').classList.remove('active');
        });

        document.getElementById('logoutConfirmBtn').addEventListener('click', () => {
            logoutUser();
        });

        // Close on backdrop click
        document.getElementById('logoutOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('active');
            }
        });
    }

    // Bind all logout buttons to show confirmation instead of immediate logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('logoutOverlay');
            if (overlay) {
                overlay.classList.add('active');
            } else {
                logoutUser(); // fallback
            }
        });
    });

    // Notification bell → go to notifications page
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            // Determine correct path based on current page location
            const path = window.location.pathname.replace(/\\/g, '/');
            let notifUrl = 'pages/notifications.html';
            if (path.includes('/qcommerce-inventory/pages/')) {
                notifUrl = 'notifications.html';
            }
            window.location.href = notifUrl;
        });
        // Update badge count from low-stock products
        updateNotifBadge();
    }
});

// Update notification badge with low-stock count
async function updateNotifBadge() {
    const badgeEl = document.getElementById('notifBadge');
    if (!badgeEl) return;
    const products = await DB.getProducts();
    const lowCount = products.filter(p => (p.currentStock ?? p.stock ?? 0) <= p.minStock).length;
    if (lowCount > 0) {
        badgeEl.textContent = lowCount;
        badgeEl.style.display = 'flex';
    } else {
        badgeEl.style.display = 'none';
    }
}
