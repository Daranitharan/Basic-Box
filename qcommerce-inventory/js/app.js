// app.js — Dashboard Logic

let refreshInterval = null;
let isRefreshing    = false;
let salesChartInstance = null; // Chart.js instance

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Date in header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Refresh button
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

    await updateDashboard(false);
    setupDashboardSearch();
    startAutoRefresh();
});

// ── Auto-refresh ──────────────────────────────────────────────
function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (!isRefreshing && document.visibilityState === 'visible') {
            updateDashboard(true);
        }
    }, 15000); // every 15 s
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (!refreshInterval) startAutoRefresh();
        if (!isRefreshing) updateDashboard(true);
    } else {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
});

// ── Exported trigger for other pages ─────────────────────────
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

// ── Main update function ──────────────────────────────────────
async function updateDashboard(silent) {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
        const products  = await DB.getProducts();
        const purchases = await DB.getPurchases();
        const sales     = await DB.getSales();

        const todayStr = new Date().toDateString();

        // ── Stats ───────────────────────────────────────────
        // 1. Total Products
        animateValue(document.getElementById('total-products'), products.length, false, true);

        // 2. Stock Value (based on latest purchase price per product)
        let stockValue = 0;
        products.forEach(prod => {
            const latestBuy = purchases
                .filter(p => p.productId === prod.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const stock = prod.currentStock ?? prod.stock ?? 0;
            if (latestBuy) stockValue += stock * Number(latestBuy.purchasePrice);
        });
        animateValue(document.getElementById('stock-value'), stockValue, true, false);

        // 3. Total Sales amount
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

        // 7. Total Orders
        animateValue(document.getElementById('total-orders'), sales.length, false, true);

        // 8. Greeting
        updateGreeting();

        // 9. Sales chart
        renderSalesChart(sales);

        // 10. Low stock + recent transactions (below chart)
        updateLowStockAlerts(products);
        renderRecentTransactions(purchases, sales, todayStr);

        // 11. Last-updated label
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

    // Month selector
    const monthSel = document.getElementById('chartMonthSelect');
    const now      = new Date();
    const selYear  = monthSel ? parseInt(monthSel.dataset.year  || now.getFullYear()) : now.getFullYear();
    const selMonth = monthSel ? parseInt(monthSel.dataset.month || now.getMonth())    : now.getMonth();

    // Days in selected month
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const labels      = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Aggregate daily sales for selected month
    const dailySales  = new Array(daysInMonth).fill(0);
    const dailyProfit = new Array(daysInMonth).fill(0);

    sales.forEach(s => {
        const d = new Date(s.date);
        if (d.getFullYear() === selYear && d.getMonth() === selMonth) {
            const day = d.getDate() - 1; // 0-indexed
            dailySales[day]  += s.totalAmount || 0;
            dailyProfit[day] += s.profit      || 0;
        }
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const tickColor  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const tooltipBg  = isDark ? '#1a1a2e' : '#fff';
    const tooltipFg  = isDark ? '#f0f0f0' : '#111';

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Sales (₹)',
                data: dailySales,
                borderColor: '#ff7a00',
                backgroundColor: isDark
                    ? 'rgba(255,122,0,0.13)'
                    : 'rgba(255,122,0,0.08)',
                borderWidth: 2.5,
                pointRadius: dailySales.map(v => v > 0 ? 4 : 0),
                pointHoverRadius: 6,
                pointBackgroundColor: '#ff7a00',
                pointBorderColor: isDark ? '#1a1a2e' : '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.42,
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
                pointBorderColor: isDark ? '#1a1a2e' : '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.42,
                borderDash: [],
            }
        ]
    };

    if (salesChartInstance) {
        // Update existing chart instead of destroying & recreating
        salesChartInstance.data = chartData;
        salesChartInstance.options.scales.x.ticks.color = tickColor;
        salesChartInstance.options.scales.y.ticks.color = tickColor;
        salesChartInstance.options.scales.x.grid.color  = gridColor;
        salesChartInstance.options.scales.y.grid.color  = gridColor;
        salesChartInstance.update('active');
        return;
    }

    salesChartInstance = new Chart(canvas, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: tickColor,
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 4,
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
                        maxTicksLimit: 15,
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
        }
    });
}

// ── Low Stock ─────────────────────────────────────────────────
function updateLowStockAlerts(products) {
    const listEl  = document.getElementById('lowStockList');
    const countEl = document.getElementById('lowStockCount');
    if (!listEl || !countEl) return;

    // Only flag products where minStock is set AND stock is at/below it
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
function renderRecentTransactions(purchases, sales, todayStr) {
    const recentDiv = document.getElementById('recent-transactions');
    if (!recentDiv) return;

    const todayPurchases = purchases.filter(p => new Date(p.date).toDateString() === todayStr);
    const todaySales     = sales.filter(s => new Date(s.date).toDateString() === todayStr);

    const all = [
        ...todayPurchases.map(p => ({ ...p, type: 'purchase' })),
        ...todaySales.map(s => ({ ...s, type: 'sale' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
        recentDiv.innerHTML = '<p class="empty-text">No transactions today.</p>';
        return;
    }

    recentDiv.innerHTML = '';
    all.forEach(t => {
        const div = document.createElement('div');
        div.className = 'purchase-item';
        if (t.type === 'purchase') {
            div.innerHTML = `
                <div class="title"><i class="fas fa-truck" style="color:var(--accent);margin-right:6px;"></i>Bought: ${t.productName}</div>
                <div class="meta">
                    Qty ${t.quantity} × ₹${Number(t.purchasePrice).toFixed(2)} = <strong>₹${Number(t.totalCost).toFixed(2)}</strong>
                    <br><span style="opacity:.6">${new Date(t.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>`;
        } else {
            const profit = t.profit || 0;
            const pc = profit >= 0 ? 'var(--success)' : 'var(--danger)';
            div.innerHTML = `
                <div class="title"><i class="fas fa-shopping-cart" style="color:var(--success);margin-right:6px;"></i>Sold: ${t.productName}</div>
                <div class="meta">
                    Qty ${t.quantity} | <strong>₹${Number(t.totalAmount).toFixed(2)}</strong> | <span style="color:${pc}">${profit>=0?'Profit':'Loss'}: ₹${Math.abs(profit).toFixed(2)}</span>
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
}

// ── Search ────────────────────────────────────────────────────
function setupDashboardSearch() {
    const lowStockSearch = document.getElementById('lowStockSearch');
    if (lowStockSearch) {
        lowStockSearch.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#lowStockList li').forEach(li => {
                const t = li.textContent.toLowerCase();
                li.style.display = t.includes(term) ? '' : 'none';
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
