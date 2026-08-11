// app.js - Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    // Show current date in header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    updateDashboard();
});

// Animate a number from 0 to target value
function animateValue(el, end, isCurrency, isInteger) {
    const duration = 800;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        // easeOutCubic for a smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = end * eased;

        if (isInteger) {
            el.textContent = Math.round(value).toString();
        } else if (isCurrency) {
            el.textContent = '₹' + value.toFixed(2);
        } else {
            el.textContent = value.toFixed(1) + '%';
        }

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

function updateDashboard() {
    const products = Storage.get('products') || [];
    const purchases = Storage.get('purchases') || [];
    const sales = Storage.get('sales') || [];

    // ========== 1. Total Products ==========
    animateValue(document.getElementById('total-products'), products.length, false, true);

    // ========== 2. Total Stock Value ==========
    // Calculated based on latest purchase price (simple version)
    let stockValue = 0;
    products.forEach(product => {
        const productPurchases = purchases.filter(p => p.productId === product.id);
        if (productPurchases.length > 0) {
            const latestPrice = productPurchases[0].purchasePrice; // most recent
            stockValue += (product.stock || 0) * latestPrice;
        }
    });
    animateValue(document.getElementById('stock-value'), stockValue, true, false);

    // ========== 3. Total Sales ==========
    let totalSales = 0;
    sales.forEach(sale => {
        totalSales += sale.totalAmount || 0;
    });
    animateValue(document.getElementById('total-sales'), totalSales, true, false);

    // ========== 4. Total Profit ==========
    let totalProfit = 0;
    sales.forEach(sale => {
        totalProfit += sale.profit || 0;
    });
    animateValue(document.getElementById('total-profit'), totalProfit, true, false);

    // ========== 5. Today's Profit ==========
    const today = new Date().toDateString();
    let todayProfit = 0;
    sales.forEach(sale => {
        if (new Date(sale.date).toDateString() === today) {
            todayProfit += sale.profit || 0;
        }
    });
    animateValue(document.getElementById('today-profit'), todayProfit, true, false);

    // ========== 6. Profit Margin ==========
    let margin = 0;
    if (totalSales > 0) {
        margin = (totalProfit / totalSales) * 100;
    }
    animateValue(document.getElementById('profit-margin'), margin, false, false);

    // ========== 7. Total Orders (Sales count) ==========
    animateValue(document.getElementById('total-orders'), sales.length, false, true);

    // ========== 8. Low Stock Alerts ==========
    updateLowStockAlerts(products);
    updateGreeting();

    // ========== 9. Recent Transactions ==========
    const recentDiv = document.getElementById('recent-transactions') ||
                      document.querySelector('.card-body');

    // Combine purchases + sales for recent activity
    const allTransactions = [
        ...purchases.map(p => ({...p, type: 'purchase'})),
        ...sales.map(s => ({...s, type: 'sale'}))
    ];

    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allTransactions.length === 0) {
        if (recentDiv) {
            recentDiv.innerHTML = `<p class="empty-text">No transactions yet. Start by adding products and recording buys/sells.</p>`;
        }
        return;
    }

    let html = '';
    allTransactions.slice(0, 6).forEach(t => {
        if (t.type === 'purchase') {
            html += `
                <div class="purchase-item">
                    <div class="title">Bought: ${t.productName}</div>
                    <div class="meta">
                        Qty: ${t.quantity} × ₹${t.purchasePrice.toFixed(2)} = ₹${t.totalCost.toFixed(2)}
                        <br>${new Date(t.date).toLocaleString()}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="purchase-item">
                    <div class="title">Sold: ${t.productName}</div>
                    <div class="meta">
                        Qty: ${t.quantity} | Profit: ₹${(t.profit || 0).toFixed(2)}
                        <br>${new Date(t.date).toLocaleString()}
                    </div>
                </div>
            `;
        }
    });

    if (recentDiv) {
        recentDiv.innerHTML = html;
    }
}

// Highlight low-stock products on the dashboard
function updateLowStockAlerts(products) {
    const listEl = document.getElementById('lowStockList');
    const countEl = document.getElementById('lowStockCount');
    if (!listEl || !countEl) return;

    // Products at or below their minimum stock level
    const lowStock = products.filter(p => (p.stock || 0) <= p.minStock);

    countEl.textContent = lowStock.length;

    if (lowStock.length === 0) {
        listEl.innerHTML = '<p class="empty-text">All products are sufficiently stocked.</p>';
        return;
    }

    let html = '<ul class="low-stock-list">';
    lowStock.forEach(product => {
        const stock = product.stock || 0;
        const isOut = stock === 0;
        const icon = isOut ? 'fa-box-open' : 'fa-boxes';
        const stockClass = isOut ? 'out' : 'low';
        const label = isOut ? 'Out of stock' : 'Low stock';

        html += `
            <li>
                <div class="item-info">
                    <div class="item-icon"><i class="fas ${icon}"></i></div>
                    <div>
                        <div class="item-name">${product.name}</div>
                        <div class="item-sku">${product.sku} · ${label}</div>
                    </div>
                </div>
                <div class="item-stock ${stockClass}">
                    <span class="stock-qty">${stock} ${product.unit}</span>
                    <span class="item-sku">min: ${product.minStock}</span>
                </div>
            </li>
        `;
    });
    html += '</ul>';

    listEl.innerHTML = html;
}

// Show the logged-in user's name in the header
function updateGreeting() {
    const greetingEl = document.querySelector('.header-greeting .greeting');
    if (!greetingEl) return;

    const user = getCurrentUser();
    if (user && user.name) {
        const firstName = user.name.split(' ')[0];
        greetingEl.textContent = 'Welcome back, ' + firstName + '!';
    }
}
