// orders.js — Order management module for Basics Box

const ORDERS_KEY = 'bb-orders';

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
    new:       { label: 'New',             icon: 'fa-inbox',         color: '#3b82f6',  next: 'preparing' },
    preparing: { label: 'Preparing',       icon: 'fa-fire',          color: '#d97706',  next: 'ready'     },
    ready:     { label: 'Ready',           icon: 'fa-check',         color: '#8b5cf6',  next: 'delivery'  },
    delivery:  { label: 'Out for Delivery',icon: 'fa-motorcycle',    color: '#0ea5e9',  next: 'completed' },
    completed: { label: 'Completed',       icon: 'fa-check-circle',  color: '#16a34a',  next: null        },
    cancelled: { label: 'Cancelled',       icon: 'fa-times-circle',  color: '#dc2626',  next: null        },
};

const STATUS_FLOW = ['new', 'preparing', 'ready', 'delivery', 'completed'];

let allOrders      = [];
let orderItems     = [];    // items being built in the modal
let currentFilter  = 'all';
let openOrderId    = null;

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadOrders();
    bindUI();
    await populateProductDropdown();
});

// ── Data helpers ─────────────────────────────────────────────
function getOrders()          { return Storage.get(ORDERS_KEY) || []; }
function saveOrders(orders)   { Storage.set(ORDERS_KEY, orders); }

async function loadOrders() {
    allOrders = getOrders();
    renderOrderStats();
    renderOrdersTable();
}

// Generate short order ID
function nextOrderId() {
    const orders = getOrders();
    const max = orders.reduce((m, o) => {
        const n = parseInt((o.orderId || '0').replace('#', '')) || 0;
        return Math.max(m, n);
    }, 1000);
    return '#' + (max + 1);
}

// ── Render stats ──────────────────────────────────────────────
function renderOrderStats() {
    const counts = { all: allOrders.length, new: 0, preparing: 0, ready: 0, delivery: 0, completed: 0, cancelled: 0 };
    allOrders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

    document.getElementById('stat-all')?.setAttribute('data-v', counts.all);
    document.getElementById('stat-new')?.setAttribute('data-v', counts.new);
    document.getElementById('stat-preparing')?.setAttribute('data-v', counts.preparing);
    document.getElementById('stat-completed')?.setAttribute('data-v', counts.completed);

    ['all','new','preparing','completed'].forEach(s => {
        const el = document.getElementById(`stat-${s}`);
        if (el) animCount(el, counts[s]);
    });
}

function animCount(el, target) {
    const dur = 500;
    const start = performance.now();
    function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Render table ──────────────────────────────────────────────
function renderOrdersTable() {
    const wrap    = document.getElementById('ordersTableWrap');
    const search  = (document.getElementById('ordersSearch')?.value || '').toLowerCase();
    const status  = document.getElementById('statusFilter')?.value || 'all';
    const date    = document.getElementById('dateFilter')?.value || '';

    let orders = [...allOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (currentFilter !== 'all') orders = orders.filter(o => o.status === currentFilter);
    if (status !== 'all')        orders = orders.filter(o => o.status === status);
    if (date)                    orders = orders.filter(o => o.date.startsWith(date));
    if (search) {
        orders = orders.filter(o =>
            (o.orderId || '').toLowerCase().includes(search) ||
            (o.customer || '').toLowerCase().includes(search) ||
            (o.phone || '').toLowerCase().includes(search)
        );
    }

    if (orders.length === 0) {
        wrap.innerHTML = `
            <div class="orders-empty">
                <i class="fas fa-shopping-bag"></i>
                <h3>No orders yet</h3>
                <p>Orders will appear here. Click "New Order" to create one manually.</p>
            </div>`;
        return;
    }

    const rows = orders.map(o => {
        const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.new;
        const time = new Date(o.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const itemCount = (o.items || []).length;
        return `
            <tr style="cursor:pointer;" onclick="openOrderDetail('${o.id}')">
                <td><strong style="font-family:'Space Grotesk',sans-serif;">${o.orderId}</strong></td>
                <td>${o.customer || '—'}<br><small style="color:var(--text-faint);">${o.phone || ''}</small></td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><strong>₹${Number(o.total || 0).toFixed(2)}</strong></td>
                <td>
                    <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;font-size:0.75rem;font-weight:600;background:${cfg.color}22;color:${cfg.color};">
                        <i class="fas ${cfg.icon}"></i> ${cfg.label}
                    </span>
                </td>
                <td>
                    <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;font-size:0.72rem;font-weight:600;background:${o.paymentStatus==='paid'?'var(--success-soft)':'var(--danger-soft)'};color:${o.paymentStatus==='paid'?'var(--success)':'var(--danger)'};">
                        ${o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                </td>
                <td style="color:var(--text-faint);font-size:0.82rem;">${time}</td>
                <td onclick="event.stopPropagation()">
                    <div style="display:flex;gap:6px;">
                        ${cfg.next ? `<button class="btn btn-edit" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation();advanceStatus('${o.id}')">Next →</button>` : ''}
                        ${o.status !== 'cancelled' && o.status !== 'completed' ? `<button class="btn btn-danger" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation();cancelOrder('${o.id}')">Cancel</button>` : ''}
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
                        <th>Items</th>
                        <th>Total</th>
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

// ── Bind UI ───────────────────────────────────────────────────
function bindUI() {
    // Stat card filter
    document.querySelectorAll('#orderStatsGrid .stat-card').forEach(card => {
        card.addEventListener('click', () => {
            currentFilter = card.dataset.filter || 'all';
            renderOrdersTable();
        });
    });

    // Search / filters
    document.getElementById('ordersSearch')?.addEventListener('input', renderOrdersTable);
    document.getElementById('statusFilter')?.addEventListener('change', renderOrdersTable);
    document.getElementById('dateFilter')?.addEventListener('change', renderOrdersTable);

    // New Order modal
    document.getElementById('newOrderBtn')?.addEventListener('click', openNewOrderModal);
    document.getElementById('closeOrderModal')?.addEventListener('click', closeOrderModal);
    document.getElementById('cancelOrderBtn')?.addEventListener('click', closeOrderModal);

    document.getElementById('orderModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeOrderModal();
    });

    // Add item button
    document.getElementById('addItemBtn')?.addEventListener('click', addItemToOrder);

    // Form submit
    document.getElementById('orderForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        await placeOrder();
    });

    // Detail panel close
    document.getElementById('closeDetailPanel')?.addEventListener('click', closeDetailPanel);
    document.getElementById('orderDetailOverlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDetailPanel();
    });
}

// ── Product dropdown ──────────────────────────────────────────
async function populateProductDropdown() {
    const products = await DB.getProducts();
    const sel = document.getElementById('itemProduct');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select product...</option>';
    products.forEach(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.dataset.name  = p.name;
        opt.dataset.unit  = p.unit;
        opt.dataset.stock = stock;
        opt.textContent = `${p.name} (${stock} ${p.unit} left)`;
        sel.appendChild(opt);
    });
}

// ── Modal helpers ─────────────────────────────────────────────
function openNewOrderModal() {
    orderItems = [];
    document.getElementById('orderForm')?.reset();
    document.getElementById('deliveryFee').value = '0';
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
    const selOpt = selEl.options[selEl.selectedIndex];

    if (!selEl.value) { showToast('Please select a product', 'error'); return; }

    const existing = orderItems.find(i => i.productId === selEl.value);
    if (existing) {
        existing.qty   += qty;
        existing.total  = existing.qty * existing.price;
    } else {
        orderItems.push({
            productId:   selEl.value,
            productName: selOpt.dataset.name,
            unit:        selOpt.dataset.unit,
            availStock:  parseInt(selOpt.dataset.stock) || 0,
            qty,
            price,
            total: qty * price
        });
    }
    renderItemsList();
    updateOrderSummary();
    selEl.value = '';
    document.getElementById('itemQty').value = '1';
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
        list.innerHTML = '<p style="text-align:center; color:var(--text-faint); font-size:0.85rem; padding: 16px 0;">No items added yet.</p>';
        return;
    }
    list.innerHTML = orderItems.map(item => `
        <div class="order-item-row">
            <div class="order-item-name">${item.productName}</div>
            <div class="order-item-qty">${item.qty} ${item.unit}</div>
            <div class="order-item-price">₹${item.total.toFixed(2)}</div>
            <button type="button" class="order-item-del" onclick="removeItem('${item.productId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>`).join('');
}

window.updateOrderSummary = function() {
    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const fee      = parseFloat(document.getElementById('deliveryFee')?.value) || 0;
    const total    = subtotal + fee;
    const sub = document.getElementById('summarySubtotal');
    const tot = document.getElementById('summaryTotal');
    if (sub) sub.textContent = '₹' + subtotal.toFixed(2);
    if (tot) tot.textContent = '₹' + total.toFixed(2);
};

// ── Place order ───────────────────────────────────────────────
async function placeOrder() {
    if (orderItems.length === 0) { showToast('Add at least one item', 'error'); return; }

    const customer       = document.getElementById('orderCustomer').value.trim();
    const phone          = document.getElementById('orderPhone').value.trim();
    const address        = document.getElementById('orderAddress').value.trim();
    const deliveryFee    = parseFloat(document.getElementById('deliveryFee').value) || 0;
    const payment        = document.getElementById('orderPayment').value;
    const paymentStatus  = document.getElementById('orderPaymentStatus').value;
    const notes          = document.getElementById('orderNotes').value.trim();

    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const total    = subtotal + deliveryFee;

    // Check stock availability
    const products = await DB.getProducts();
    for (const item of orderItems) {
        const prod = products.find(p => p.id === item.productId);
        const avail = prod ? (prod.currentStock ?? prod.stock ?? 0) : 0;
        if (item.qty > avail) {
            showToast(`Insufficient stock for ${item.productName} (${avail} available)`, 'error');
            return;
        }
    }

    const order = {
        id:            Date.now().toString(),
        orderId:       nextOrderId(),
        customer,
        phone,
        address,
        items:         orderItems.map(i => ({ ...i })),
        subtotal,
        deliveryFee,
        total,
        payment,
        paymentStatus,
        notes,
        status:        'new',
        timeline:      [{ status: 'new', time: new Date().toISOString() }],
        date:          new Date().toISOString()
    };

    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
    allOrders = orders;

    closeOrderModal();
    renderOrderStats();
    renderOrdersTable();
    showToast(`Order ${order.orderId} placed successfully!`, 'success');
}

// ── Order status actions ──────────────────────────────────────
window.advanceStatus = function(id) {
    const orders = getOrders();
    const idx    = orders.findIndex(o => o.id === id);
    if (idx === -1) return;

    const order  = orders[idx];
    const cfg    = STATUS_CONFIG[order.status];
    if (!cfg?.next) return;

    const newStatus = cfg.next;

    // If completing — deduct stock
    if (newStatus === 'completed') {
        confirmAction(
            `Mark order ${order.orderId} as Completed?`,
            `This will deduct stock for ${order.items.length} item(s).`,
            async () => {
                await deductOrderStock(order);
                orders[idx].status = 'completed';
                orders[idx].timeline = orders[idx].timeline || [];
                orders[idx].timeline.push({ status: 'completed', time: new Date().toISOString() });
                saveOrders(orders);
                allOrders = orders;
                renderOrderStats();
                renderOrdersTable();
                if (openOrderId === id) openOrderDetail(id);
                showToast(`Order ${order.orderId} completed!`, 'success');
            }
        );
        return;
    }

    orders[idx].status = newStatus;
    orders[idx].timeline = orders[idx].timeline || [];
    orders[idx].timeline.push({ status: newStatus, time: new Date().toISOString() });
    saveOrders(orders);
    allOrders = orders;

    const nextCfg = STATUS_CONFIG[newStatus];
    renderOrderStats();
    renderOrdersTable();
    if (openOrderId === id) openOrderDetail(id);
    showToast(`Order ${order.orderId} → ${nextCfg.label}`, 'success');
};

async function deductOrderStock(order) {
    for (const item of (order.items || [])) {
        const products = await DB.getProducts();
        const prod = products.find(p => p.id === item.productId);
        if (!prod) continue;
        const current = prod.currentStock ?? prod.stock ?? 0;
        const newStock = Math.max(0, current - item.qty);
        await DB.updateProductStock(item.productId, newStock);
    }
}

window.cancelOrder = function(id) {
    const orders = getOrders();
    const order  = orders.find(o => o.id === id);
    if (!order) return;

    confirmAction(
        `Cancel order ${order.orderId}?`,
        'This action cannot be undone. The order will be marked as cancelled.',
        () => {
            const idx = orders.findIndex(o => o.id === id);
            orders[idx].status = 'cancelled';
            orders[idx].timeline = orders[idx].timeline || [];
            orders[idx].timeline.push({ status: 'cancelled', time: new Date().toISOString() });
            saveOrders(orders);
            allOrders = orders;
            renderOrderStats();
            renderOrdersTable();
            if (openOrderId === id) openOrderDetail(id);
            showToast(`Order ${order.orderId} cancelled`, 'info');
        }
    );
};

// ── Confirmation dialog ───────────────────────────────────────
function confirmAction(title, body, onConfirm) {
    // Use existing logout overlay structure as template
    const existing = document.getElementById('orderConfirmOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'orderConfirmOverlay';
    overlay.className = 'logout-overlay';
    overlay.innerHTML = `
        <div class="logout-dialog">
            <div class="logout-dialog-icon" style="background:var(--accent-soft);color:var(--accent);">
                <i class="fas fa-question-circle"></i>
            </div>
            <h3>${title}</h3>
            <p>${body}</p>
            <div class="logout-dialog-actions">
                <button class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmOkBtn"><i class="fas fa-check"></i> Confirm</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 250);
    });
    overlay.querySelector('#confirmOkBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 250);
        onConfirm();
    });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 250);
        }
    });
}

// ── Order detail panel ────────────────────────────────────────
window.openOrderDetail = function(id) {
    openOrderId = id;
    const orders = getOrders();
    const order  = orders.find(o => o.id === id);
    if (!order) return;

    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;

    // Timeline
    const timelineSteps = STATUS_FLOW.map(s => {
        const tlEntry = (order.timeline || []).find(t => t.status === s);
        const isDone  = tlEntry !== undefined;
        const isCurr  = order.status === s && !['completed','cancelled'].includes(order.status);
        const dotClass = isDone ? (isCurr ? 'current' : 'done') : '';
        const timeStr  = tlEntry ? new Date(tlEntry.time).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending';
        return `
            <div class="timeline-step ${isDone ? 'done' : ''}">
                <div class="timeline-dot ${dotClass}">
                    <i class="fas ${STATUS_CONFIG[s].icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label">${STATUS_CONFIG[s].label}</div>
                    <div class="timeline-time">${isDone ? timeStr : 'Pending'}</div>
                </div>
            </div>`;
    });

    if (order.status === 'cancelled') {
        const tlEntry = (order.timeline || []).find(t => t.status === 'cancelled');
        timelineSteps.push(`
            <div class="timeline-step done">
                <div class="timeline-dot done" style="background:var(--danger-soft);border-color:var(--danger);color:var(--danger);">
                    <i class="fas fa-times"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label" style="color:var(--danger);">Cancelled</div>
                    <div class="timeline-time">${tlEntry ? new Date(tlEntry.time).toLocaleString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</div>
                </div>
            </div>`);
    }

    // Items
    const itemRows = (order.items || []).map(item => `
        <div class="detail-item-row">
            <div>
                <div style="font-weight:500;font-size:0.9rem;">${item.productName}</div>
                <div style="font-size:0.75rem;color:var(--text-faint);">Qty: ${item.qty} ${item.unit}</div>
            </div>
            <strong>₹${item.total.toFixed(2)}</strong>
        </div>`).join('');

    // Next action button
    const nextStatus = cfg.next;
    const nextCfg    = nextStatus ? STATUS_CONFIG[nextStatus] : null;
    const actionBtns = order.status !== 'completed' && order.status !== 'cancelled' ? `
        <div class="action-btn-row">
            ${nextCfg ? `<button class="btn btn-primary" onclick="advanceStatus('${order.id}')">
                <i class="fas ${nextCfg.icon}"></i> Mark as ${nextCfg.label}
            </button>` : ''}
            <button class="btn btn-secondary" style="color:var(--danger);border-color:var(--danger-soft);" onclick="cancelOrder('${order.id}')">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>` : '';

    const content = `
        <div class="detail-section">
            <div class="detail-section-title">Customer</div>
            <div style="font-weight:600;">${order.customer || '—'}</div>
            ${order.phone ? `<div style="font-size:0.85rem;color:var(--text-faint);margin-top:4px;"><i class="fas fa-phone" style="margin-right:6px;"></i>${order.phone}</div>` : ''}
            ${order.address ? `<div style="font-size:0.85rem;color:var(--text-faint);margin-top:4px;"><i class="fas fa-map-marker-alt" style="margin-right:6px;"></i>${order.address}</div>` : ''}
        </div>

        <div class="detail-section">
            <div class="detail-section-title">Order Items</div>
            ${itemRows}
            <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:0.85rem;color:var(--text-faint);">
                <span>Delivery Fee</span><span>₹${(order.deliveryFee||0).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:700;font-size:1rem;border-top:1px solid var(--card-border);margin-top:4px;">
                <span>Total</span><span style="color:var(--accent);">₹${(order.total||0).toFixed(2)}</span>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-section-title">Payment</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.9rem;">${order.payment?.toUpperCase() || 'CASH'}</span>
                <span style="padding:3px 10px;border-radius:14px;font-size:0.75rem;font-weight:600;background:${order.paymentStatus==='paid'?'var(--success-soft)':'var(--danger-soft)'};color:${order.paymentStatus==='paid'?'var(--success)':'var(--danger)'};">
                    ${order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
            </div>
            ${order.paymentStatus !== 'paid' ? `
            <button class="btn btn-secondary" style="width:100%;margin-top:10px;justify-content:center;" onclick="markOrderPaid('${order.id}')">
                <i class="fas fa-rupee-sign"></i> Mark as Paid
            </button>` : ''}
        </div>

        <div class="detail-section">
            <div class="detail-section-title">Status Timeline</div>
            <div class="status-timeline">${timelineSteps.join('')}</div>
        </div>

        ${order.notes ? `<div class="detail-section"><div class="detail-section-title">Notes</div><p style="font-size:0.88rem;color:var(--text-faint);">${order.notes}</p></div>` : ''}

        ${actionBtns}
    `;

    document.getElementById('detailOrderId').textContent = order.orderId;
    const statusBadge = document.getElementById('detailOrderStatus');
    if (statusBadge) {
        statusBadge.className = `order-status ${order.status}`;
        statusBadge.textContent = cfg.label;
    }
    document.getElementById('detailPanelContent').innerHTML = content;
    document.getElementById('orderDetailOverlay').classList.add('active');
};

window.markOrderPaid = function(id) {
    const orders = getOrders();
    const idx    = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    orders[idx].paymentStatus = 'paid';
    saveOrders(orders);
    allOrders = orders;
    renderOrdersTable();
    openOrderDetail(id); // refresh panel
    showToast('Payment marked as received', 'success');
};

function closeDetailPanel() {
    openOrderId = null;
    document.getElementById('orderDetailOverlay').classList.remove('active');
}

// expose for inline onclick
window.removeItem = removeItem;
