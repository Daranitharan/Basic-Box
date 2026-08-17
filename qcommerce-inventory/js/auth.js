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
// Extra metadata: { shopName, phone, address, gstin }
async function registerUser(name, email, password, meta = {}) {
    const sb = getSupabase();

    if (sb) {
        // Supabase Auth sign-up — email confirmation is enabled on the server side.
        // We do NOT auto-login here; the user must click the confirmation link first.
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: { name, ...meta },
                emailRedirectTo: window.location.origin + '/login.html'
            }
        });

        if (error) return { ok: false, error: error.message };

        // Return a dummy user object so the caller can show the confirmation screen.
        // We do NOT write to localStorage — the user is not confirmed yet.
        const user = { id: data.user?.id || '', name, email, pendingConfirmation: true };
        return { ok: true, user };
    }

    // ── localStorage fallback (no email confirmation needed) ──
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
        id:       Date.now().toString(),
        name:     name.trim(),
        email:    email.trim(),
        password, // NOTE: stored plain-text in localStorage (dev only)
        ...meta
    };
    users.push(user);
    saveUsers(users);

    // Persist session immediately (no email confirmation for local mode)
    localStorage.setItem('qcommerce-user', JSON.stringify(user));

    // Seed a welcome email
    const welcomeEmail = [{
        id:       'welcome-' + user.id,
        from:     'support@basicsbox.app',
        fromName: 'Basics Box Support',
        to:       email,
        subject:  'Welcome to Basics Box!',
        body:     `Hi ${name},\n\nWelcome to Basics Box – your inventory & profit tracker.\n\nGet started by adding your products, then record your buys and sells.\n\nHappy selling!\n– The Basics Box Team`,
        date:     new Date().toISOString(),
        folder:   'inbox'
    }];
    Storage.set('bb-emails', welcomeEmail);

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
        // Clear old cached data before setting new user session
        localStorage.removeItem('qcommerce-user');
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

    // Set new user session — storage.js will now namespace all keys to this user
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

// Update notification badge with unread count (only real low-stock alerts)
async function updateNotifBadge() {
    const badgeEl = document.getElementById('notifBadge');
    if (!badgeEl) return;

    try {
        const products = await DB.getProducts();
        // Only count products where minStock > 0 AND stock is at/below min
        const lowCount = products.filter(p => {
            const stock = p.currentStock ?? p.stock ?? 0;
            const min = p.minStock ?? 0;
            return min > 0 && stock <= min;
        }).length;

        // Check how many are unread
        const readRaw = localStorage.getItem('bb-notifs-read');
        const readSet = new Set(readRaw ? JSON.parse(readRaw) : []);

        // Count unread low-stock items
        let unreadCount = 0;
        products.forEach(p => {
            const stock = p.currentStock ?? p.stock ?? 0;
            const min = p.minStock ?? 0;
            if (min > 0 && stock <= min) {
                const id = stock === 0 ? `stock-out-${p.id}` : `stock-low-${p.id}`;
                if (!readSet.has(id)) unreadCount++;
            }
        });

        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    } catch(e) {
        badgeEl.style.display = 'none';
    }
}
