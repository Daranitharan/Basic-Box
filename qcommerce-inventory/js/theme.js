// theme.js - Light/Dark theme toggle with localStorage persistence

// Apply saved theme (or system preference) on load
function initTheme() {
    const saved = localStorage.getItem('qcommerce-theme');
    let theme = saved;

    if (!theme) {
        // Fall back to system preference
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
}

// Update the toggle button icon
function updateToggleIcon(theme) {
    const toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
}

// Toggle between light and dark
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('qcommerce-theme', next);
    updateToggleIcon(next);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', toggleTheme);
    }
});
