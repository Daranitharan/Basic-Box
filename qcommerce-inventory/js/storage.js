// storage.js - Handles all data saving/loading using localStorage
// Data is namespaced per user so each account has isolated data.

const Storage = {
    // Get the active user's namespace prefix
    _prefix() {
        try {
            const raw = localStorage.getItem('qcommerce-user');
            if (raw) {
                const u = JSON.parse(raw);
                if (u && u.id) return `user_${u.id}_`;
            }
        } catch(e) {}
        return 'guest_';
    },

    get(key) {
        // Theme and auth keys are global (not per-user)
        if (key === 'qcommerce-theme' || key === 'qcommerce-user' || key === 'qcommerce-users') {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
        const data = localStorage.getItem(this._prefix() + key);
        return data ? JSON.parse(data) : null;
    },

    set(key, value) {
        if (key === 'qcommerce-theme' || key === 'qcommerce-user' || key === 'qcommerce-users') {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }
        localStorage.setItem(this._prefix() + key, JSON.stringify(value));
    },

    remove(key) {
        if (key === 'qcommerce-theme' || key === 'qcommerce-user' || key === 'qcommerce-users') {
            localStorage.removeItem(key);
            return;
        }
        localStorage.removeItem(this._prefix() + key);
    }
};
