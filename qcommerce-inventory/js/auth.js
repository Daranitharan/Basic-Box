// auth.js - Registration, login, logout, and page guard

const USERS_KEY = 'qcommerce-users';
const AUTH_KEY = 'qcommerce-user';

// ---------- Storage helpers ----------
function getUsers() {
    return Storage.get(USERS_KEY) || [];
}

function saveUsers(users) {
    Storage.set(USERS_KEY, users);
}

// ---------- Registration ----------
function registerUser(name, email, password, profile) {
    const users = getUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (exists) {
        return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        password: password,
        profile: profile || {}
    };

    users.push(user);
    saveUsers(users);

    return { ok: true, user };
}

// ---------- Login ----------
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (!user) {
        return { ok: false, error: 'Invalid email or password.' };
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { ok: true, user };
}

// ---------- Session ----------
function getCurrentUser() {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
}

function logoutUser() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = loginPageUrl();
}

function loginPageUrl() {
    const normalized = window.location.pathname.replace(/\\/g, '/');

    if (normalized.endsWith('/login.html')) {
        return 'login.html';
    }

    if (normalized.includes('/qcommerce-inventory/pages/')) {
        return '../../login.html';
    }

    if (normalized.includes('/qcommerce-inventory/')) {
        return '../login.html';
    }

    return 'login.html';
}

// ---------- Guard + UI bindings ----------
document.addEventListener('DOMContentLoaded', () => {
    const isAuthPage = document.body.classList.contains('auth-page');

    // Protected pages redirect to login when there is no session
    if (!isAuthPage && !getCurrentUser()) {
        window.location.href = loginPageUrl();
        return;
    }

    // Bind all logout buttons
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    });
});
