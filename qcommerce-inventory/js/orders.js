// orders.js — Single source of truth for all sales/order data

const ORDERS_KEY = 'bb-orders';

const STATUS_CONFIG = {
    new:       { label: 'New',              icon: 'fa-inbox',       color: '#3b82f6', next: 'preparing' },
    preparing: { label: 'Preparing',        icon: 'fa-fire',        color: '#d97706', next: 'ready'     },
    ready:     { label: 'Ready',            icon: 'fa-check',       color: '#8b5cf6', next: 'delivery'  },
    delivery:  { label: 'Out for Delivery', icon: 'fa-motorcycle',  color: '#0ea5e9', next: 'completed' },
    completed: { label: 'Completed',        icon: 'fa-check-circle',color: '#16a34a', next: null        },
    cancelled: { label: 'Cancelled',        icon: 'fa-times-circle',color: '#dc2626', next: null        },
};

const STATUS_FLOW = ['new', 'preparing', 'ready', 'delivery', 'completed'];

let allOrders     = [];
let orderItems    = [];
let currentFilter = 'all';
let openOrderId   = null;

// ── Public helpers (used by other modules) ────────────────────
window.getOrdersData = function () { return Storage.get(ORDERS_KEY) || []; };

// Get all completed orders as "sales" for dashboard / reports / inventory
window.getCompletedOrderSales = function () {
    const orders = window.getOrdersData();
    const sales  = [];
    orders.filter(o => o.status === 'completed').forEach(order => {
        (order.items || []).forEach(item => {
            const costPrice    = Number(item.costPrice || 0);
            const sellingPrice = Number(item.price || 0);
            const qty          = Number(item.qty || 0);
            const totalAmount  = qty * sellingPrice;
            const profit       = (sellingPrice - costPrice) * qty;
            sales.push({
                id:           `${order.id}-${item.productId}`,
                orderId:      order.id,
                orderLabel:   order.orderId,
                productId:    item.productId,
                productName:  item.productName,
                sku:          item.sku || '',
                quantity:     qty,
                sellingPrice,
                totalAmount,
                costPrice,
                profit,
                customer:     order.customer || '',
                date:         order.completedAt || order.date,
                orderType:    order.orderType || 'offline',
            });
        });
    });
    return sales;
};

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadOrders();
    bindUI();
    await populateProductDropdown();
});

function getOrders()        { return Storage.get(ORDERS_KEY) || []; }
function saveOrders(orders) { Storage.set(ORDERS_KEY, orders); }

async function loadOrders() {
    allOrders = getOrders();
    renderOrderStats();
    renderOrdersTable();
}

function nextOrderId() {
    const orders = getOrders();
    const max = orders.reduce((m, o) => {
        const n = parseInt((o.orderId || '0').replace('#', '')) || 0;
        return Math.max(m, n);
    }, 1000);
    return '#' + (max + 1);
}

// ── Stats ────────────────────────────────────────────────────
function renderOrderStats() {
    const counts = { all: allOrders.length, new: 0, preparing: 0, completed: 0 };
    allOrders.forEach(o => {
        if (counts[o.status] !== undefined) counts[o.status]++;
    });

    const totalRev = allOrders.filter(o => o.status === 'completed')
        .reduce((s, o) => s + (o.total || 0), 0);
    const totalProfit = allOrders.filter(o => o.status === 'completed')
        .reduce((s, o) => s + (o.profit || 0), 0);

    ['all','new','preparing','completed'].forEach(key => {
        const el = document.getElementById(`stat-${key}`);
        if (el) animCount(el, counts[key]);
    });
    const revEl = document.getElementById('stat-revenue');
    if (revEl) revEl.textContent = '₹' + totalRev.toFixed(2);
    const profEl = document.getElementById('stat-profit');
    if (profEl) profEl.textContent = '₹' + totalProfit.toFixed(2);
}

function animCount(el, target) {
    const dur = 500; const start = performance.now();
    const tick = now => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// ── Orders Table ──────────────────────────────────────────────
function renderOrdersTable() {
    const wrap   = document.getElementById('ordersTableWrap');
    const search = (document.getElementById('ordersSearch')?.value || '').toLowerCase();
    const status = document.getElementById('statusFilter')?.value || 'all';
    const date   = document.getElementById('dateFilter')?.value || '';

    let orders = [...allOrders].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (currentFilter !== 'all') orders = orders.filter(o => o.status === currentFilter);
    if (status !== 'all')        orders = orders.filter(o => o.status === status);
    if (date)                    orders = orders.filter(o => o.date.startsWith(date));
    if (search) orders = orders.filter(o =>
        (o.orderId||'').toLowerCase().includes(search) ||
        (o.customer||'').toLowerCase().includes(search) ||
        (o.phone||'').toLowerCase().includes(search)
    );

    if (orders.length === 0) {
        wrap.innerHTML = `<div class="orders-empty"><i class="fas fa-shopping-bag"></i><h3>No orders found</h3><p>Click "New Order" to create one.</p></div>`;
        return;
    }

    const rows = orders.map(o => {
        const cfg      = STATUS_CONFIG[o.status] || STATUS_CONFIG.new;
        const time     = new Date(o.date).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const typeBadge= o.orderType === 'online'
            ? `<span style="padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;background:rgba(14,165,233,0.12);color:#0ea5e9;"><i class="fas fa-globe"></i> Online</span>`
            : `<span style="padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;background:var(--accent-soft);color:var(--accent-strong);"><i class="fas fa-store"></i> Offline</span>`;
        const profitVal = o.profit || 0;
        const profitCol = profitVal >= 0
            ? `<span style="color:var(--success);font-weight:600;">+₹${profitVal.toFixed(2)}</span>`
            : `<span style="color:var(--danger);font-weight:600;">-₹${Math.abs(profitVal).toFixed(2)}</span>`;

        return `
            <tr style="cursor:pointer;" onclick="openOrderDetail('${o.id}')">
                <td><strong style="font-family:'Space Grotesk',sans-serif;">${o.orderId}</strong><br><small>${typeBadge}</small></td>
                <td>${o.customer||'—'}<br><small style="color:var(--text-faint);">${o.phone||''}</small></td>
                <td style="font-size:0.82rem;">
                    ${(o.items||[]).map(i=>`${i.productName}<br><span style="color:var(--text-faint);">₹${Number(i.price||0).toFixed(2)} × ${i.qty}</span>`).join('<hr style="border:none;border-top:1px solid var(--card-border);margin:3px 0;">')}
                </td>
                <td><strong>₹${Number(o.total||0).toFixed(2)}</strong></td>
                <td>${o.status==='completed' ? profitCol : '<span style="color:var(--text-faint);font-size:0.8rem;">—</span>'}</td>
                <td>
                    <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;font-size:0.75rem;font-weight:600;background:${cfg.color}22;color:${cfg.color};">
                        <i class="fas ${cfg.icon}"></i> ${cfg.label}
                    </span>
                </td>
                <td>
                    <span style="padding:3px 9px;border-radius:14px;font-size:0.72rem;font-weight:600;background:${o.paymentStatus==='paid'?'var(--success-soft)':'var(--danger-soft)'};color:${o.paymentStatus==='paid'?'var(--success)':'var(--danger)'};">
                        ${o.paymentStatus==='paid'?'Paid':'Pending'}
                    </span>
                </td>
                <td style="color:var(--text-faint);font-size:0.82rem;">${time}</td>
                <td onclick="event.stopPropagation()">
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${cfg.next?`<button class="btn btn-edit" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation();advanceStatus('${o.id}')">Next →</button>`:''}
                        ${o.status!=='cancelled'&&o.status!=='completed'?`<button class="btn btn-danger" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation();cancelOrder('${o.id}')">Cancel</button>`:''}
                    </div>
                </td>
            </tr>`;
    }).join('');

    wrap.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Items & Purchase Price</th>
                        <th>Total</th>
                        <th>Profit</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// ── UI bindings ───────────────────────────────────────────────
function bindUI() {
    document.querySelectorAll('#orderStatsGrid .stat-card[data-filter]').forEach(card => {
        card.addEventListener('click', () => {
            currentFilter = card.dataset.filter;
            renderOrdersTable();
        });
    });

    document.getElementById('ordersSearch')?.addEventListener('input', renderOrdersTable);
    document.getElementById('statusFilter')?.addEventListener('change', renderOrdersTable);
    document.getElementById('dateFilter')?.addEventListener('change', renderOrdersTable);

    document.getElementById('newOrderBtn')?.addEventListener('click', openNewOrderModal);
    document.getElementById('closeOrderModal')?.addEventListener('click', closeOrderModal);
    document.getElementById('cancelOrderBtn')?.addEventListener('click', closeOrderModal);
    document.getElementById('orderModal')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeOrderModal(); });

    document.getElementById('addItemBtn')?.addEventListener('click', addItemToOrder);
    document.getElementById('orderForm')?.addEventListener('submit', async e => { e.preventDefault(); await placeOrder(); });

    document.getElementById('closeDetailPanel')?.addEventListener('click', closeDetailPanel);
    document.getElementById('orderDetailOverlay')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeDetailPanel(); });

    // Offline / Online toggle
    document.getElementById('orderTypeOffline')?.addEventListener('change', updateOrderTypeUI);
    document.getElementById('orderTypeOnline')?.addEventListener('change', updateOrderTypeUI);
}

function updateOrderTypeUI() {
    const isOnline = document.getElementById('orderTypeOnline')?.checked;
    const deliverySection = document.getElementById('deliverySection');
    if (deliverySection) deliverySection.style.display = isOnline ? '' : 'none';
    if (!isOnline) {
        document.getElementById('deliveryFee').value = '0';
        updateOrderSummary();
    }
}

// ── Product dropdown ──────────────────────────────────────────
async function populateProductDropdown() {
    const [products, purchases] = await Promise.all([DB.getProducts(), DB.getPurchases()]);
    const container = document.getElementById('itemProductOptions');
    const hiddenInput = document.getElementById('itemProduct');
    const trigger = document.getElementById('itemProductTrigger');
    const search = document.getElementById('itemProductSearch');
    if (!container || !hiddenInput || !trigger) return;

    const productOptions = products.map(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const latestBuy = purchases
            .filter(b => b.productId === p.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const costPrice = latestBuy ? Number(latestBuy.purchasePrice) : 0;
        return {
            id: p.id,
            name: p.name,
            sku: p.sku || '',
            unit: p.unit,
            stock,
            cost: costPrice,
            label: `${p.name} — ₹${costPrice.toFixed(2)} cost (${stock} ${p.unit})`
        };
    });

    const renderOptions = (filter = '') => {
        const q = filter.trim().toLowerCase();
        const filtered = productOptions.filter(option =>
            option.label.toLowerCase().includes(q) ||
            option.name.toLowerCase().includes(q) ||
            option.sku.toLowerCase().includes(q)
        );

        if (!filtered.length) {
            container.innerHTML = '<div class="custom-option empty">No products found</div>';
            return;
        }

        container.innerHTML = filtered.map(option => `
            <button type="button" class="custom-option" data-id="${option.id}" data-name="${option.name}" data-sku="${option.sku}" data-unit="${option.unit}" data-stock="${option.stock}" data-cost="${option.cost}">
                <span>${option.label}</span>
            </button>
        `).join('');

        container.querySelectorAll('.custom-option:not(.empty)').forEach(button => {
            button.addEventListener('click', () => {
                const selected = {
                    id: button.dataset.id,
                    name: button.dataset.name,
                    sku: button.dataset.sku,
                    unit: button.dataset.unit,
                    stock: button.dataset.stock,
                    cost: button.dataset.cost,
                };

                hiddenInput.value = selected.id;
                hiddenInput.dataset.name = selected.name;
                hiddenInput.dataset.sku = selected.sku;
                hiddenInput.dataset.unit = selected.unit;
                hiddenInput.dataset.stock = selected.stock;
                hiddenInput.dataset.cost = selected.cost;
                trigger.querySelector('span').textContent = selected.name + ' — ₹' + Number(selected.cost).toFixed(2) + ' cost';
                trigger.classList.remove('open');
                document.getElementById('itemProductMenu')?.classList.remove('open');
                search.value = '';
                renderOptions();
            });
        });
    };

    renderOptions();

    trigger.addEventListener('click', () => {
        const menu = document.getElementById('itemProductMenu');
        const isOpen = menu?.classList.contains('open');
        menu?.classList.toggle('open', !isOpen);
        trigger.classList.toggle('open', !isOpen);
        if (!isOpen && search) search.focus();
    });

    search?.addEventListener('input', (e) => renderOptions(e.target.value));

    document.addEventListener('click', (event) => {
        const select = document.getElementById('itemProductSelect');
        const menu = document.getElementById('itemProductMenu');
        if (!select?.contains(event.target)) {
            menu?.classList.remove('open');
            trigger.classList.remove('open');
        }
    });

    if (!hiddenInput.value) {
        trigger.querySelector('span').textContent = 'Select product...';
    }
}

// ── Modal ─────────────────────────────────────────────────────
function openNewOrderModal() {
    orderItems = [];
    document.getElementById('orderForm')?.reset();
    document.getElementById('deliveryFee').value = '0';
    // Default to offline
    document.getElementById('orderTypeOffline').checked = true;
    updateOrderTypeUI();
    renderItemsList();
    updateOrderSummary();
    document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function addItemToOrder() {
    const selEl  = document.getElementById('itemProduct');
    const qty    = parseInt(document.getElementById('itemQty').value) || 1;
    const price  = parseFloat(document.getElementById('itemPrice').value) || 0;
    if (!selEl?.value) { showToast('Please select a product', 'error'); return; }

    const costPrice = parseFloat(selEl.dataset.cost) || 0;
    const existing  = orderItems.find(i => i.productId === selEl.value);
    if (existing) {
        existing.qty   += qty;
        existing.total  = existing.qty * existing.price;
    } else {
        orderItems.push({
            productId:   selEl.value,
            productName: selEl.dataset.name,
            sku:         selEl.dataset.sku,
            unit:        selEl.dataset.unit,
            availStock:  parseInt(selEl.dataset.stock) || 0,
            costPrice,
            qty,
            price,
            total: qty * price
        });
    }
    renderItemsList();
    updateOrderSummary();
    selEl.value = '';
    selEl.removeAttribute('data-name');
    selEl.removeAttribute('data-sku');
    selEl.removeAttribute('data-unit');
    selEl.removeAttribute('data-stock');
    selEl.removeAttribute('data-cost');
    document.getElementById('itemProductTrigger').querySelector('span').textContent = 'Select product...';
    document.getElementById('itemQty').value  = '1';
    document.getElementById('itemPrice').value = '';
}

function removeItem(productId) {
    orderItems = orderItems.filter(i => i.productId !== productId);
    renderItemsList();
    updateOrderSummary();
}

function renderItemsList() {
    const list = document.getElementById('orderItemsList');
    if (!list) return;
    if (orderItems.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-faint);font-size:0.85rem;padding:16px 0;">No items added yet.</p>';
        return;
    }
    list.innerHTML = orderItems.map(item => {
        const profit = (item.price - item.costPrice) * item.qty;
        const pc     = profit >= 0 ? 'var(--success)' : 'var(--danger)';
        return `<div class="order-item-row">
            <div>
                <div class="order-item-name">${item.productName}</div>
                <div style="font-size:0.75rem;color:var(--text-faint);">Cost: ₹${item.costPrice.toFixed(2)} | Qty: ${item.qty} ${item.unit}</div>
            </div>
            <div class="order-item-qty">₹${item.total.toFixed(2)}</div>
            <div class="order-item-price" style="color:${pc};font-size:0.78rem;">${profit>=0?'+':''}₹${profit.toFixed(2)}</div>
            <button type="button" class="order-item-del" onclick="removeItem('${item.productId}')"><i class="fas fa-times"></i></button>
        </div>`;
    }).join('');
}

window.updateOrderSummary = function () {
    const subtotal    = orderItems.reduce((s, i) => s + i.total, 0);
    const totalCost   = orderItems.reduce((s, i) => s + (i.costPrice * i.qty), 0);
    const itemsProfit = subtotal - totalCost;
    const fee         = parseFloat(document.getElementById('deliveryFee')?.value) || 0;
    const total       = subtotal + fee;
    const profit      = itemsProfit;

    const sub = document.getElementById('summarySubtotal');
    const tot = document.getElementById('summaryTotal');
    const pro = document.getElementById('summaryProfit');
    const feeDisplay = document.getElementById('summaryDeliveryFeeDisplay');
    
    if (sub) sub.textContent = '₹' + subtotal.toFixed(2);
    if (tot) tot.textContent = '₹' + total.toFixed(2);
    if (feeDisplay) feeDisplay.textContent = '₹' + fee.toFixed(2);
    if (pro) {
        pro.textContent = (profit >= 0 ? '+' : '') + '₹' + profit.toFixed(2);
        pro.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
};

// ── Place order ───────────────────────────────────────────────
async function placeOrder() {
    if (orderItems.length === 0) { showToast('Add at least one item', 'error'); return; }

    const customer      = document.getElementById('orderCustomer').value.trim();
    const phone         = document.getElementById('orderPhone').value.trim();
    const isOnline      = document.getElementById('orderTypeOnline')?.checked;
    const orderType     = isOnline ? 'online' : 'offline';
    const address       = isOnline ? (document.getElementById('orderAddress')?.value.trim() || '') : '';
    const deliveryFee   = isOnline ? (parseFloat(document.getElementById('deliveryFee').value) || 0) : 0;
    const payment       = document.getElementById('orderPayment').value;
    const paymentStatus = document.getElementById('orderPaymentStatus').value;
    const notes         = document.getElementById('orderNotes').value.trim();

    // Stock check
    const products = await DB.getProducts();
    for (const item of orderItems) {
        const prod  = products.find(p => p.id === item.productId);
        const avail = prod ? (prod.currentStock ?? prod.stock ?? 0) : 0;
        if (item.qty > avail) {
            showToast(`Insufficient stock for ${item.productName} (${avail} available)`, 'error');
            return;
        }
    }

    const subtotal    = orderItems.reduce((s, i) => s + i.total, 0);
    const totalCost   = orderItems.reduce((s, i) => s + (i.costPrice * i.qty), 0);
    const profit      = subtotal - totalCost;
    const total       = subtotal + deliveryFee;

    const order = {
        id:           Date.now().toString(),
        orderId:      nextOrderId(),
        orderType,
        customer,
        phone,
        address,
        items:        orderItems.map(i => ({ ...i })),
        subtotal,
        totalCost,
        profit,
        deliveryFee,
        total,
        payment,
        paymentStatus,
        notes,
        status:       'new',
        timeline:     [{ status: 'new', time: new Date().toISOString() }],
        date:         new Date().toISOString(),
    };

    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
    allOrders = orders;

    // Sync to Supabase if configured
    DB.saveOrder(order).catch(e => console.warn('DB.saveOrder:', e));

    closeOrderModal();
    renderOrderStats();
    renderOrdersTable();
    showToast(`Order ${order.orderId} placed!`, 'success');

    if (typeof window.triggerDashboardRefresh === 'function') window.triggerDashboardRefresh();
}

// ── Status transitions ────────────────────────────────────────
window.advanceStatus = function (id) {
    const orders = getOrders();
    const idx    = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    const order  = orders[idx];
    const cfg    = STATUS_CONFIG[order.status];
    if (!cfg?.next) return;

    if (cfg.next === 'completed') {
        confirmAction(
            `Complete order ${order.orderId}?`,
            `Stock will be deducted for ${order.items.length} item(s).`,
            async () => {
                await deductOrderStock(order);
                const completedAt = new Date().toISOString();
                orders[idx].status      = 'completed';
                orders[idx].completedAt = completedAt;
                orders[idx].timeline    = orders[idx].timeline || [];
                orders[idx].timeline.push({ status: 'completed', time: completedAt });
                saveOrders(orders);
                allOrders = orders;
                // Sync to Supabase
                DB.saveOrder(orders[idx]).catch(e => console.warn('DB.saveOrder:', e));
                renderOrderStats();
                renderOrdersTable();
                if (openOrderId === id) openOrderDetail(id);
                showToast(`Order ${order.orderId} completed!`, 'success');
                if (typeof window.triggerDashboardRefresh === 'function') window.triggerDashboardRefresh();
            }
        );
        return;
    }

    orders[idx].status = cfg.next;
    orders[idx].timeline = orders[idx].timeline || [];
    orders[idx].timeline.push({ status: cfg.next, time: new Date().toISOString() });
    saveOrders(orders);
    allOrders = orders;
    // Sync to Supabase
    DB.saveOrder(orders[idx]).catch(e => console.warn('DB.saveOrder:', e));
    renderOrderStats();
    renderOrdersTable();
    if (openOrderId === id) openOrderDetail(id);
    showToast(`Order ${order.orderId} → ${STATUS_CONFIG[cfg.next].label}`, 'success');
};

async function deductOrderStock(order) {
    for (const item of (order.items || [])) {
        const products = await DB.getProducts();
        const prod     = products.find(p => p.id === item.productId);
        if (!prod) continue;
        const current  = prod.currentStock ?? prod.stock ?? 0;
        await DB.updateProductStock(item.productId, Math.max(0, current - item.qty));
    }
}

window.cancelOrder = function (id) {
    const orders = getOrders();
    const order  = orders.find(o => o.id === id);
    if (!order) return;
    confirmAction(
        `Cancel order ${order.orderId}?`,
        'This cannot be undone.',
        () => {
            const idx = orders.findIndex(o => o.id === id);
            orders[idx].status = 'cancelled';
            orders[idx].timeline = orders[idx].timeline || [];
            orders[idx].timeline.push({ status: 'cancelled', time: new Date().toISOString() });
            saveOrders(orders);
            allOrders = orders;
            DB.saveOrder(orders[idx]).catch(e => console.warn('DB.saveOrder:', e));
            renderOrderStats();
            renderOrdersTable();
            if (openOrderId === id) openOrderDetail(id);
            showToast(`Order ${order.orderId} cancelled`, 'info');
        }
    );
};

window.markOrderPaid = function (id) {
    const orders = getOrders();
    const idx    = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    orders[idx].paymentStatus = 'paid';
    saveOrders(orders);
    allOrders = orders;
    DB.saveOrder(orders[idx]).catch(e => console.warn('DB.saveOrder:', e));
    renderOrdersTable();
    openOrderDetail(id);
    showToast('Marked as paid', 'success');
};

// ── Confirm dialog ────────────────────────────────────────────
function confirmAction(title, body, onConfirm) {
    const ex = document.getElementById('orderConfirmOverlay');
    if (ex) ex.remove();
    const overlay = document.createElement('div');
    overlay.id = 'orderConfirmOverlay';
    overlay.className = 'logout-overlay';
    overlay.innerHTML = `
        <div class="logout-dialog">
            <div class="logout-dialog-icon" style="background:var(--accent-soft);color:var(--accent);"><i class="fas fa-question-circle"></i></div>
            <h3>${title}</h3><p>${body}</p>
            <div class="logout-dialog-actions">
                <button class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmOkBtn"><i class="fas fa-check"></i> Confirm</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 250); });
    overlay.querySelector('#confirmOkBtn').addEventListener('click', () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 250); onConfirm(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 250); } });
}

// ── Detail panel ──────────────────────────────────────────────
window.openOrderDetail = function (id) {
    openOrderId = id;
    const orders = getOrders();
    const order  = orders.find(o => o.id === id);
    if (!order) return;
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;

    // Timeline HTML
    const tlHtml = STATUS_FLOW.map(s => {
        const entry   = (order.timeline || []).find(t => t.status === s);
        const isDone  = !!entry;
        const isCurr  = order.status === s && !['completed','cancelled'].includes(order.status);
        const dotCls  = isDone ? (isCurr ? 'current' : 'done') : '';
        const timeStr = entry ? new Date(entry.time).toLocaleString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Pending';
        return `<div class="timeline-step ${isDone?'done':''}">
            <div class="timeline-dot ${dotCls}"><i class="fas ${STATUS_CONFIG[s].icon}"></i></div>
            <div class="timeline-content"><div class="timeline-label">${STATUS_CONFIG[s].label}</div><div class="timeline-time">${isDone?timeStr:'Pending'}</div></div>
        </div>`;
    }).join('');

    // Items HTML
    const itemsHtml = (order.items || []).map(item => {
        const profit  = ((item.price || 0) - (item.costPrice || 0)) * item.qty;
        const pc      = profit >= 0 ? 'var(--success)' : 'var(--danger)';
        return `<div class="detail-item-row">
            <div>
                <div style="font-weight:500;font-size:0.9rem;">${item.productName}</div>
                <div style="font-size:0.75rem;color:var(--text-faint);">
                    Qty: ${item.qty} ${item.unit} | Sell: ₹${Number(item.price||0).toFixed(2)} | Cost: ₹${Number(item.costPrice||0).toFixed(2)}
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:600;">₹${Number(item.total||0).toFixed(2)}</div>
                <div style="font-size:0.75rem;color:${pc};">${profit>=0?'+':''}₹${profit.toFixed(2)} profit</div>
            </div>
        </div>`;
    }).join('');

    const nextCfg    = cfg.next ? STATUS_CONFIG[cfg.next] : null;
    const actionBtns = order.status !== 'completed' && order.status !== 'cancelled' ? `
        <div class="action-btn-row">
            ${nextCfg ? `<button class="btn btn-primary" onclick="advanceStatus('${order.id}')"><i class="fas ${nextCfg.icon}"></i> ${nextCfg.label}</button>` : ''}
            <button class="btn btn-secondary" style="color:var(--danger);border-color:var(--danger-soft);" onclick="cancelOrder('${order.id}')"><i class="fas fa-times"></i> Cancel</button>
        </div>` : '';

    const typeBadge = order.orderType === 'online'
        ? `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;background:rgba(14,165,233,0.12);color:#0ea5e9;"><i class="fas fa-globe"></i> Online Order</span>`
        : `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;background:var(--accent-soft);color:var(--accent-strong);"><i class="fas fa-store"></i> Offline Order</span>`;

    const profitVal  = order.profit || 0;
    const profitHtml = order.status === 'completed'
        ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;">
               <span style="color:var(--text-faint);">Profit</span>
               <strong style="color:${profitVal>=0?'var(--success)':'var(--danger)'};">${profitVal>=0?'+':''}₹${profitVal.toFixed(2)}</strong>
           </div>` : '';

    document.getElementById('detailOrderId').textContent = order.orderId;
    const badge = document.getElementById('detailOrderStatus');
    if (badge) { badge.className = `order-status ${order.status}`; badge.textContent = cfg.label; }

    document.getElementById('detailPanelContent').innerHTML = `
        <div class="detail-section">
            <div class="detail-section-title">Order Type</div>
            ${typeBadge}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Customer</div>
            <div style="font-weight:600;">${order.customer||'—'}</div>
            ${order.phone?`<div style="font-size:0.85rem;color:var(--text-faint);margin-top:4px;"><i class="fas fa-phone" style="margin-right:6px;"></i>${order.phone}</div>`:''}
            ${order.address?`<div style="font-size:0.85rem;color:var(--text-faint);margin-top:4px;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>${order.address}</div>`:''}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Items</div>
            ${itemsHtml}
            <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:0.85rem;color:var(--text-faint);">
                <span>Delivery Fee</span><span>₹${(order.deliveryFee||0).toFixed(2)}</span>
            </div>
            ${profitHtml}
            <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:700;font-size:1rem;border-top:1px solid var(--card-border);margin-top:4px;">
                <span>Total</span><span style="color:var(--accent);">₹${(order.total||0).toFixed(2)}</span>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Payment</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.9rem;">${(order.payment||'cash').toUpperCase()}</span>
                <span style="padding:3px 10px;border-radius:14px;font-size:0.75rem;font-weight:600;background:${order.paymentStatus==='paid'?'var(--success-soft)':'var(--danger-soft)'};color:${order.paymentStatus==='paid'?'var(--success)':'var(--danger)'};">
                    ${order.paymentStatus==='paid'?'Paid':'Pending'}
                </span>
            </div>
            ${order.paymentStatus!=='paid'?`<button class="btn btn-secondary" style="width:100%;margin-top:10px;justify-content:center;" onclick="markOrderPaid('${order.id}')"><i class="fas fa-rupee-sign"></i> Mark as Paid</button>`:''}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Status Timeline</div>
            <div class="status-timeline">${tlHtml}</div>
        </div>
        ${order.notes?`<div class="detail-section"><div class="detail-section-title">Notes</div><p style="font-size:0.88rem;color:var(--text-faint);">${order.notes}</p></div>`:''}
        ${actionBtns}
    `;
    document.getElementById('orderDetailOverlay').classList.add('active');
};

function closeDetailPanel() {
    openOrderId = null;
    document.getElementById('orderDetailOverlay').classList.remove('active');
}

window.removeItem = removeItem;
