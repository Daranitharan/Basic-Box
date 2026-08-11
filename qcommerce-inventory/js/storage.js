// storage.js - Handles all data saving and loading using localStorage

const Storage = {
    // Get data from localStorage
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    // Save data to localStorage
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // Remove data
    remove(key) {
        localStorage.removeItem(key);
    }
};