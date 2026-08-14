// app.js - Dashboard Logic

let refreshInterval = null;
let isRefreshing = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Show current date in header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    await updateDashboard();
    setupDashboardSearch();
    startAutoRefresh();
    setupManualRefresh();
});

// Auto-refresh dashboard every 30 seconds
function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(async () => {
        if (!isRefreshing && document.visibilityState === 'visible') {
            await updateDashboard(true); // silent refresh
        }
    }, 30000); // 30 seconds
}

// Stop auto-refresh when page becomes hidden
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    } else if (document.visibilityState === 'visible') {
        startAutoRefresh();
        // Refresh immediately when page becomes visible
        if (!isRefreshing) updateDashboard(true);
    }
});

// Manual refresh button
function setupManualRefresh() {
    // Refresh button already exists in HTML, just add event listener
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (isRefreshing) return;
            refreshBtn.querySelector('i').classList.add('fa-spin');
            await updateDashboard();
            refreshBtn.querySelector('i').classList.remove('fa-spin');
            showToast('Dashboard refreshed!', 'success');
        });
    }
}

// Animate a number from 0 to target value
function animateValue(el, end, isCurrency, isInteger) {
    if (!el) return;
    const duration = 800;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = end * eased;

        if (isInteger)       el.textContent = Math.round(value).toString();
        else if (isCurrency) el.textContent = '₹' + value.toFixed(2);
        else                 el.textContent = value.toFixed(1) + '%';

        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

async function updateDashboard(silent = false) {
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
        // Show connection status for non-silent updates
        if (!silent) {
            showConnectionStatus('connecting');
        }

        // Show loading indicator on manual refresh
        if (!silent) {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.querySelector('i').classList.add('fa-spin');
            }
        }

        // Fetch from Supabase (or localStorage fallback via DB layer)
        const products  = await DB.getProducts();
        const purchases = await DB.getPurchases();
        const sales     = await DB.getSales();

        // 1. Total Products
        animateValue(document.getElementById('total-products'), products.length, false, true);

        // 2. Stock Value
        let stockValue = 0;
        products.forEach(product => {
            const productPurchases = purchases.filter(p => p.productId === product.id);
            const currentStockValue = product.currentStock ?? product.stock ?? 0;
            if (productPurchases.length > 0) {
                stockValue += currentStockValue * productPurchases[0].purchasePrice;
            }
        });
        animateValue(document.getElementById('stock-value'), stockValue, true, false);

        // 3. Total Sales
        let totalSales = 0;
        sales.forEach(s => { totalSales += s.totalAmount || 0; });
        animateValue(document.getElementById('total-sales'), totalSales, true, false);

        // 4. Total Profit
        let totalProfit = 0;
        sales.forEach(s => { totalProfit += s.profit || 0; });
        animateValue(document.getElementById('total-profit'), totalProfit, true, false);

        // 5. Today's Profit
        const today = new Date().toDateString();
        let todayProfit = 0;
        sales.forEach(s => {
            if (new Date(s.date).toDateString() === today) todayProfit += s.profit || 0;
        });
        animateValue(document.getElementById('today-profit'), todayProfit, true, false);

        // 6. Profit Margin
        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        animateValue(document.getElementById('profit-margin'), margin, false, false);

        // 7. Total Orders
        animateValue(document.getElementById('total-orders'), sales.length, false, true);

        // 8. Low Stock Alerts
        updateLowStockAlerts(products);
        updateGreeting();

        // 9. Recent Transactions (Today Only)
        const recentDiv = document.getElementById('recent-transactions');
        const today = new Date().toDateString();
        
        // Filter transactions to today only
        const todayPurchases = purchases.filter(p => new Date(p.date).toDateString() === today);
        const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
        
        const allTransactions = [
            ...todayPurchases.map(p => ({ ...p, type: 'purchase' })),
            ...todaySales.map(s => ({ ...s, type: 'sale' }))
        ];
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allTransactions.length === 0) {
            if (recentDiv) recentDiv.innerHTML = `<p class="empty-text">No transactions today.</p>`;
        } else {
            let html = '';
            allTransactions.forEach(t => {
                if (t.type === 'purchase') {
                    html += `
                        <div class="purchase-item">
                            <div class="title">Bought: ${t.productName}</div>
                            <div class="meta">
                                Qty: ${t.quantity} × ₹${Number(t.purchasePrice).toFixed(2)} = ₹${Number(t.totalCost).toFixed(2)}
                                <br>${new Date(t.date).toLocaleString()}
                            </div>
                        </div>`;
                } else {
                    html += `
                        <div class="purchase-item">
                            <div class="title">Sold: ${t.productName}</div>
                            <div class="meta">
                                Qty: ${t.quantity} | Profit: ₹${Number(t.profit || 0).toFixed(2)}
                                <br>${new Date(t.date).toLocaleString()}
                            </div>
                        </div>`;
                }
            });
            if (recentDiv) recentDiv.innerHTML = html;
        }
        
        // Update last refresh time indicator
        updateLastRefreshTime();
        
        // Remove connection status
        if (!silent) {
            showConnectionStatus();
        }
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        if (!silent) {
            showToast('Error refreshing dashboard', 'error');
        }
    } finally {
        isRefreshing = false;
        
        // Remove loading indicator
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.querySelector('i').classList.remove('fa-spin');
        }
    }
}

function updateLowStockAlerts(products) {
    const listEl  = document.getElementById('lowStockList');
    const countEl = document.getElementById('lowStockCount');
    if (!listEl || !countEl) return;

    const lowStock = products.filter(p => (p.currentStock ?? p.stock ?? 0) <= p.minStock);
    countEl.textContent = lowStock.length;

    if (lowStock.length === 0) {
        listEl.innerHTML = '<p class="empty-text">All products are sufficiently stocked.</p>';
        return;
    }

    let html = '<ul class="low-stock-list">';
    lowStock.forEach(product => {
        const stock = product.currentStock ?? product.stock ?? 0;
        const isOut = stock === 0;
        html += `
            <li>
                <div class="item-info">
                    <div class="item-icon"><i class="fas ${isOut ? 'fa-box-open' : 'fa-boxes'}"></i></div>
                    <div>
                        <div class="item-name">${product.name}</div>
                        <div class="item-sku">${product.sku} · ${isOut ? 'Out of stock' : 'Low stock'}</div>
                    </div>
                </div>
                <div class="item-stock ${isOut ? 'out' : 'low'}">
                    <span class="stock-qty">${stock} ${product.unit}</span>
                    <span class="item-sku">min: ${product.minStock}</span>
                </div>
            </li>`;
    });
    html += '</ul>';
    listEl.innerHTML = html;
}

function updateGreeting() {
    const greetingEl = document.querySelector('.header-greeting .greeting');
    if (!greetingEl) return;
    const user = getCurrentUser();
    if (user && user.name) {
        greetingEl.textContent = 'Welcome back, ' + user.name.split(' ')[0] + '!';
    }
}

function setupDashboardSearch() {
    // Low Stock Search
    const lowStockSearch = document.getElementById('lowStockSearch');
    if (lowStockSearch) {
        lowStockSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#lowStockList .low-stock-list li').forEach(item => {
                const name = item.querySelector('.item-name')?.textContent.toLowerCase() || '';
                const sku  = item.querySelector('.item-sku')?.textContent.toLowerCase() || '';
                item.style.display = (name.includes(term) || sku.includes(term)) ? '' : 'none';
            });
        });
    }

    // Transactions Search
    const txSearch = document.getElementById('transactionsSearch');
    if (txSearch) {
        txSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#recent-transactions .purchase-item').forEach(item => {
                const title = item.querySelector('.title')?.textContent.toLowerCase() || '';
                const meta  = item.querySelector('.meta')?.textContent.toLowerCase() || '';
                item.style.display = (title.includes(term) || meta.includes(term)) ? '' : 'none';
            });
        });
    }
}

// Update last refresh time indicator
function updateLastRefreshTime() {
    // Add or update refresh time in page subtitle
    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle) {
        const time = new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Remove existing refresh time if present
        let text = subtitle.textContent.replace(/ • Last updated: \d{2}:\d{2}:\d{2}/, '');
        subtitle.textContent = `${text} • Last updated: ${time}`;
        
        // Add a subtle flash animation to indicate refresh
        subtitle.style.opacity = '0.7';
        setTimeout(() => {
            subtitle.style.opacity = '1';
        }, 200);
    }
}

// Add connection status indicator
function showConnectionStatus(status) {
    const existingStatus = document.getElementById('connectionStatus');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    if (status === 'connecting') {
        const statusEl = document.createElement('div');
        statusEl.id = 'connectionStatus';
        statusEl.innerHTML = '<i class="fas fa-wifi"></i> Syncing...';
        statusEl.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: var(--accent-grad); 
            color: white; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 0.85rem; 
            font-weight: 500; 
            z-index: 1000; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: pulse 2s infinite;
        `;
        document.body.appendChild(statusEl);
    }
}

// Add CSS animation for connection status
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Real-time updates when user performs actions
function triggerDashboardRefresh() {
    if (!isRefreshing) {
        updateDashboard(true); // silent refresh
    }
}

// Export for use by other scripts
window.triggerDashboardRefresh = triggerDashboardRefresh;
