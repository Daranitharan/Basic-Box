// app.js — Dashboard Logic (manual refresh only)

let isRefreshing       = false;
let salesChartInstance = null;

const STATUS_CONFIG = window.STATUS_CONFIG || {
    new:       { label: 'New',              icon: 'fa-inbox',        color: '#3b82f6', next: 'preparing' },
    preparing: { label: 'Preparing',        icon: 'fa-fire',         color: '#d97706', next: 'ready'     },
    ready:     { label: 'Ready',            icon: 'fa-check',        color: '#8b5cf6', next: 'delivery'  },
    delivery:  { label: 'Out for Delivery', icon: 'fa-motorcycle',   color: '#0ea5e9', next: 'completed' },
    completed: { label: 'Completed',        icon: 'fa-check-circle', color: '#16a34a', next: null        },
    cancelled: { label: 'Cancelled',        icon: 'fa-times-circle', color: '#dc2626', next: null        },
};
window.STATUS_CONFIG = STATUS_CONFIG;

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Date in header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Manual refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (isRefreshing) return;
            refreshBtn.querySelector('i').classList.add('fa-spin');
            await updateDashboard(false);
            refreshBtn.querySelector('i').classList.remove('fa-spin');
            showToast('Dashboard refreshed!', 'success');
        });
    }

    // Re-render chart immediately when theme toggles (fixes invisible chart bug)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            // Let CSS variables update first (theme.js fires synchronously, so 80ms is enough)
            setTimeout(async () => {
                if (salesChartInstance) {
                    salesChartInstance.destroy();
                    salesChartInstance = null;
                }
                if (!isRefreshing) await updateDashboard(true);
            }, 80);
        });
    }

    const shopNameChip = document.getElementById('shopNameChip');
    if (shopNameChip) {
        const settings = Storage.get('bb-settings') || {};
        shopNameChip.textContent = settings.storeName || 'Basics Box';
    }

    bindRecentRangeMenu();
    await updateDashboard(false);
    setupDashboardSearch();
});

// ── Exported trigger for other pages (buy/sell/products) ─────
window.triggerDashboardRefresh = function () {
    if (!isRefreshing) updateDashboard(true);
};

// ── Number animation ──────────────────────────────────────────
function animateValue(el, end, isCurrency, isInteger) {
    if (!el) return;
    const duration  = 700;
    const startTime = performance.now();
    function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const v = end * (1 - Math.pow(1 - p, 3));
        if (isInteger)       el.textContent = Math.round(v).toString();
        else if (isCurrency) el.textContent = '₹' + v.toFixed(2);
        else                 el.textContent = v.toFixed(1) + '%';
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Main update ───────────────────────────────────────────────
async function updateDashboard(silent) {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
        const products  = await DB.getProducts();
        const purchases = await DB.getPurchases();

        // Sales data now comes exclusively from completed orders
        const orders    = Storage.get('bb-orders') || [];
        const sales     = typeof window.getCompletedOrderSales === 'function'
            ? window.getCompletedOrderSales()
            : orders.filter(o => o.status === 'completed').flatMap(o =>
                (o.items || []).map(item => ({
                    totalAmount:  (item.price || 0) * (item.qty || 0),
                    profit:       ((item.price || 0) - (item.costPrice || 0)) * (item.qty || 0),
                    date:         o.completedAt || o.date,
                    productName:  item.productName,
                    quantity:     item.qty,
                    sellingPrice: item.price,
                }))
              );

        const todayStr = new Date().toDateString();

        // 1. Total Products
        animateValue(document.getElementById('total-products'), products.length, false, true);

        // 2. Stock Value
        let stockValue = 0;
        products.forEach(prod => {
            const latestBuy = purchases
                .filter(p => p.productId === prod.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const stock = prod.currentStock ?? prod.stock ?? 0;
            if (latestBuy) stockValue += stock * Number(latestBuy.purchasePrice);
        });
        animateValue(document.getElementById('stock-value'), stockValue, true, false);

        // 3. Total Sales (from completed orders)
        const totalSales = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
        animateValue(document.getElementById('total-sales'), totalSales, true, false);

        // 4. Total Profit
        const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
        animateValue(document.getElementById('total-profit'), totalProfit, true, false);

        // 5. Today's Profit
        const todayProfit = sales
            .filter(s => new Date(s.date).toDateString() === todayStr)
            .reduce((acc, s) => acc + (s.profit || 0), 0);
        animateValue(document.getElementById('today-profit'), todayProfit, true, false);

        // 6. Profit Margin
        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        animateValue(document.getElementById('profit-margin'), margin, false, false);

        // 7. Total Orders (completed orders count)
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        animateValue(document.getElementById('total-orders'), completedOrders, false, true);

        updateGreeting();
        renderSalesChart(sales);
        updateLowStockAlerts(products);
        renderRecentTransactions(purchases, orders, todayStr);
        updateLastRefreshTime();

    } catch (err) {
        console.error('Dashboard update error:', err);
        if (!silent) showToast('Error refreshing dashboard', 'error');
    } finally {
        isRefreshing = false;
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.querySelector('i').classList.remove('fa-spin');
    }
}

// ── Sales Chart ───────────────────────────────────────────────
function renderSalesChart(sales) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const monthSel = document.getElementById('chartMonthSelect');
    const now      = new Date();
    const selYear  = monthSel ? parseInt(monthSel.dataset.year  || now.getFullYear()) : now.getFullYear();
    const selMonth = monthSel ? parseInt(monthSel.dataset.month ?? now.getMonth())    : now.getMonth();

    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const labels      = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailySales  = new Array(daysInMonth).fill(0);
    const dailyProfit = new Array(daysInMonth).fill(0);

    sales.forEach(s => {
        const d = new Date(s.date);
        if (d.getFullYear() === selYear && d.getMonth() === selMonth) {
            const day = d.getDate() - 1;
            dailySales[day]  += s.totalAmount || 0;
            dailyProfit[day] += s.profit      || 0;
        }
    });

    // Read CSS variables AFTER theme has been applied
    const root      = document.documentElement;
    const isDark    = root.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
    const tooltipBg = isDark ? '#1a1a2e'                : '#ffffff';
    const tooltipFg = isDark ? '#f0f0f0'                : '#111111';
    const salesFill = isDark ? 'rgba(255,122,0,0.14)'   : 'rgba(255,122,0,0.08)';

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Sales (₹)',
                data: dailySales,
                borderColor: '#ff7a00',
                backgroundColor: salesFill,
                borderWidth: 2.5,
                pointRadius: dailySales.map(v => v > 0 ? 4 : 2),
                pointHoverRadius: 6,
                pointBackgroundColor: '#ff7a00',
                pointBorderColor: isDark ? '#12121a' : '#ffffff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Profit (₹)',
                data: dailyProfit,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.07)',
                borderWidth: 2,
                pointRadius: dailyProfit.map(v => v !== 0 ? 3 : 0),
                pointHoverRadius: 5,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: isDark ? '#12121a' : '#ffffff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    color: tickColor,
                    boxWidth: 10,
                    boxHeight: 10,
                    borderRadius: 5,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 12, family: 'Inter, sans-serif' }
                }
            },
            tooltip: {
                backgroundColor: tooltipBg,
                titleColor: tooltipFg,
                bodyColor: tooltipFg,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                    title: ctx => `Day ${ctx[0].label}`,
                    label: ctx => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: gridColor, drawTicks: false },
                ticks: {
                    color: tickColor,
                    font: { size: 11, family: 'Inter, sans-serif' },
                    maxTicksLimit: 16,
                    maxRotation: 0
                },
                border: { display: false }
            },
            y: {
                grid: { color: gridColor, drawTicks: false },
                ticks: {
                    color: tickColor,
                    font: { size: 11, family: 'Inter, sans-serif' },
                    callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)
                },
                border: { display: false }
            }
        }
    };

    // Always destroy first — guarantees correct colors after theme switch
    if (salesChartInstance) {
        salesChartInstance.destroy();
        salesChartInstance = null;
    }

    salesChartInstance = new Chart(canvas, {
        type: 'line',
        data: chartData,
        options: chartOptions
    });
}

// ── Low Stock ─────────────────────────────────────────────────
function updateLowStockAlerts(products) {
    const listEl  = document.getElementById('lowStockList');
    const countEl = document.getElementById('lowStockCount');
    if (!listEl || !countEl) return;

    const lowStock = products.filter(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const min   = p.minStock ?? 0;
        return min > 0 && stock <= min;
    });
    countEl.textContent = lowStock.length;

    if (lowStock.length === 0) {
        listEl.innerHTML = '<p class="empty-text">All products are sufficiently stocked.</p>';
        return;
    }

    let html = '<ul class="low-stock-list">';
    lowStock.forEach(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const isOut = stock === 0;
        html += `
            <li>
                <div class="item-info">
                    <div class="item-icon"><i class="fas ${isOut ? 'fa-box-open' : 'fa-boxes'}"></i></div>
                    <div>
                        <div class="item-name">${p.name}</div>
                        <div class="item-sku">${p.sku} · ${isOut ? 'Out of stock' : 'Low stock'}</div>
                    </div>
                </div>
                <div class="item-stock ${isOut ? 'out' : 'low'}">
                    <span class="stock-qty">${stock} ${p.unit}</span>
                    <span class="item-sku">min: ${p.minStock}</span>
                </div>
            </li>`;
    });
    html += '</ul>';
    listEl.innerHTML = html;
}

// ── Recent Transactions ───────────────────────────────────────
function renderRecentTransactions(purchases, orders, todayStr) {
    const recentDiv = document.getElementById('recent-transactions');
    if (!recentDiv) return;

    // Show last 7 days of transactions instead of today only
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentPurchases = purchases.filter(p => new Date(p.date) >= sevenDaysAgo);
    const recentOrders    = orders.filter(o =>
        (o.status === 'completed' || o.status === 'new' || o.status === 'preparing') &&
        new Date(o.date) >= sevenDaysAgo
    );

    const all = [
        ...recentPurchases.map(p => ({ ...p, type: 'purchase' })),
        ...recentOrders.map(o => ({
            ...o,
            type: 'order',
            productName: (o.items || []).map(i => i.productName).join(', '),
            totalAmount: o.total,
            profit: o.profit || 0,
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
        recentDiv.innerHTML = '<p class="empty-text">No recent transactions.</p>';
        return;
    }

    recentDiv.innerHTML = '';
    all.forEach(t => {
        const div = document.createElement('div');
        div.className = 'purchase-item';
        if (t.type === 'purchase') {
            div.innerHTML = `
                <div class="title"><i class="fas fa-truck" style="color:var(--accent);margin-right:6px;"></i>Restocked: ${t.productName}</div>
                <div class="meta">
                    Qty ${t.quantity} × ₹${Number(t.purchasePrice).toFixed(2)} = <strong>₹${Number(t.totalCost).toFixed(2)}</strong>
                    <br><span style="opacity:.6">${new Date(t.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>`;
        } else {
            const profit = t.profit || 0;
            const pc = profit >= 0 ? 'var(--success)' : 'var(--danger)';
            const cfg = (STATUS_CONFIG || {})[t.status] || { label: t.status, color: '#999' };
            div.innerHTML = `
                <div class="title">
                    <i class="fas fa-shopping-cart" style="color:var(--success);margin-right:6px;"></i>
                    Order ${t.orderId} — ${t.customer || 'Customer'}
                    <span style="margin-left:6px;padding:2px 7px;border-radius:8px;font-size:0.7rem;background:${cfg.color}22;color:${cfg.color};">${cfg.label}</span>
                </div>
                <div class="meta">
                    <strong>₹${Number(t.totalAmount).toFixed(2)}</strong>
                    ${t.status === 'completed' ? `| <span style="color:${pc}">${profit>=0?'Profit':'Loss'}: ₹${Math.abs(profit).toFixed(2)}</span>` : ''}
                    <br><span style="opacity:.6">${new Date(t.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>`;
        }
        recentDiv.appendChild(div);
    });
}

// ── Greeting ──────────────────────────────────────────────────
function updateGreeting() {
    const el = document.querySelector('.header-greeting .greeting');
    if (!el) return;
    const user = getCurrentUser();
    if (user?.name) el.textContent = 'Welcome back, ' + user.name.split(' ')[0] + '!';

    const shopNameChip = document.getElementById('shopNameChip');
    if (shopNameChip) {
        const settings = Storage.get('bb-settings') || {};
        shopNameChip.textContent = settings.storeName || 'Basics Box';
    }
}

function bindRecentRangeMenu() {
    const trigger = document.getElementById('recentRangeTrigger');
    const menu = document.getElementById('recentRangeMenu');
    if (!trigger || !menu) return;

    const setRange = (range) => {
        const activeOpt = menu.querySelector('.recent-range-option.active');
        if (activeOpt) activeOpt.classList.remove('active');
        const selected = menu.querySelector(`[data-range="${range}"]`);
        if (selected) selected.classList.add('active');
        trigger.querySelector('span').textContent = selected ? selected.textContent : 'Last 7 days';
        menu.classList.remove('open');
        trigger.classList.remove('open');
        renderRecentTransactionsByRange(range);
    };

    trigger.addEventListener('click', () => {
        const isOpen = menu.classList.contains('open');
        menu.classList.toggle('open', !isOpen);
        trigger.classList.toggle('open', !isOpen);
    });

    menu.querySelectorAll('.recent-range-option').forEach(option => {
        option.addEventListener('click', () => setRange(option.dataset.range));
    });

    document.addEventListener('click', (event) => {
        if (!trigger.contains(event.target) && !menu.contains(event.target)) {
            menu.classList.remove('open');
            trigger.classList.remove('open');
        }
    });
}

function renderRecentTransactionsByRange(days) {
    const recentDiv = document.getElementById('recent-transactions');
    if (!recentDiv) return;
    const purchases = DB && DB.getPurchases ? DB.getPurchases() : Promise.resolve([]);
    const orders = Storage.get('bb-orders') || [];
    const rangeDays = Number(days || 7);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (rangeDays - 1));
    cutoff.setHours(0, 0, 0, 0);

    const records = [];
    const allPurchases = Array.isArray(DB && DB.getPurchases ? [] : []) ? [] : [];
    Promise.resolve(DB.getPurchases()).then((purchaseList) => {
        purchaseList.forEach((p) => {
            const pDate = new Date(p.date);
            if (pDate >= cutoff) records.push({ ...p, type: 'purchase' });
        });

        orders.forEach((o) => {
            const d = new Date(o.date || o.completedAt || new Date());
            if (d >= cutoff && (o.status === 'completed' || o.status === 'new' || o.status === 'preparing')) {
                records.push({
                    ...o,
                    type: 'order',
                    productName: (o.items || []).map(i => i.productName).join(', '),
                    totalAmount: o.total,
                    profit: o.profit || 0,
                });
            }
        });

        records.sort((a, b) => new Date(b.date || b.completedAt || b.createdAt || b.created_on) - new Date(a.date || a.completedAt || a.createdAt || a.created_on));
        if (!records.length) {
            recentDiv.innerHTML = '<p class="empty-text">No transactions in this range.</p>';
            return;
        }

        recentDiv.innerHTML = '';
        records.forEach((t) => {
            const div = document.createElement('div');
            div.className = 'purchase-item';
            if (t.type === 'purchase') {
                div.innerHTML = `
                    <div class="title"><i class="fas fa-truck" style="color:var(--accent);margin-right:6px;"></i>Restocked: ${t.productName}</div>
                    <div class="meta">Qty ${t.quantity} × ₹${Number(t.purchasePrice).toFixed(2)} = <strong>₹${Number(t.totalCost).toFixed(2)}</strong><br><span style="opacity:.6">${new Date(t.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
            } else {
                const profit = t.profit || 0;
                const cfg = (STATUS_CONFIG || {})[t.status] || { label: t.status, color: '#999' };
                div.innerHTML = `
                    <div class="title">
                        <i class="fas fa-shopping-cart" style="color:var(--success);margin-right:6px;"></i>
                        Order ${t.orderId} — ${t.customer || 'Customer'}
                        <span style="margin-left:6px;padding:2px 7px;border-radius:8px;font-size:0.7rem;background:${cfg.color}22;color:${cfg.color};">${cfg.label}</span>
                    </div>
                    <div class="meta"><strong>₹${Number(t.totalAmount).toFixed(2)}</strong>${t.status === 'completed' ? ` | <span style="color:${profit >=0 ? 'var(--success)' : 'var(--danger)'}">${profit >=0 ? 'Profit' : 'Loss'}: ₹${Math.abs(profit).toFixed(2)}</span>` : ''}<br><span style="opacity:.6">${new Date(t.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
            }
            recentDiv.appendChild(div);
        });
    });
}

// ── Search ────────────────────────────────────────────────────
function setupDashboardSearch() {
    const lowStockSearch = document.getElementById('lowStockSearch');
    if (lowStockSearch) {
        lowStockSearch.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#lowStockList li').forEach(li => {
                li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    const txSearch = document.getElementById('transactionsSearch');
    if (txSearch) {
        txSearch.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#recent-transactions .purchase-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
}

// ── Last refresh label ────────────────────────────────────────
function updateLastRefreshTime() {
    const el = document.getElementById('lastRefreshTime');
    if (el) {
        el.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}
