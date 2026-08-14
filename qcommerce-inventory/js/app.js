// app.js - Dashboard Logic

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
});

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

async function updateDashboard() {
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
        return;
    }

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
