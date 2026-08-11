// toast.js - Slim toast notification system

document.addEventListener('DOMContentLoaded', () => {
    // Create container once
    if (document.getElementById('toast-container')) return;
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
});

// showToast(message, type) — type: 'success' | 'error' | 'info'
function showToast(message, type) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : '') + (type === 'info' ? ' toast-info' : '');

    const icons = {
        success: '✓',
        error: '!',
        info: 'i'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '✓'}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
