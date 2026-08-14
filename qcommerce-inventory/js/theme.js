// theme.js - Light/Dark theme toggle with localStorage persistence

// ── Apply theme IMMEDIATELY (no DOMContentLoaded wait) ──────
// This runs as soon as the script loads, preventing flash of wrong theme.
(function() {
    const saved = localStorage.getItem('qcommerce-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
})();

function updateToggleIcon(theme) {
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('qcommerce-theme', next);
    updateToggleIcon(next);
}

document.addEventListener('DOMContentLoaded', () => {
    // Sync icon with current theme
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    updateToggleIcon(theme);

    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
});
