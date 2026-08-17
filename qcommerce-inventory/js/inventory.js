// inventory.js — Inventory management module

const ADJ_KEY = 'bb-adjustments';
let currentTab = 'stock';
let invProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadInventory();
    bindInventoryUI();
});

async function loadInventory() {
    const [products, purchases] = await Promise.all([
        DB.getProducts(),
        DB.getPurchases()
    ]);

    invProducts = products;
    renderSummaryCards(products, purchases);

    if (currentTab === 'stock')       renderStockTable(products, purchases);
    if (currentTab === 'movement')    renderMovement(purchases);
    if (currentTab === 'adjustments') renderAdjustments();
}

// ── Summary cards ─────────────────────────────────────────────
function renderSummaryCards(products, purchases) {
    let value = 0;
    let low = 0;
    let out = 0;

    products.forEach(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const min   = p.minStock ?? 0;
        const latestBuy = purchases.filter(b => b.productId === p.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latestBuy) value += stock * Number(latestBuy.purchasePrice);
        if (stock === 0) out++;
        else if (min > 0 && stock <= min) low++;
    });

    countUp('inv-total', products.length);
    animValStr('inv-value', '₹' + value.toFixed(2));
    countUp('inv-low', low);
    countUp('inv-out', out);
}

function countUp(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const dur = 600;
    const start = performance.now();
    function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function animValStr(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ── Stock Table ───────────────────────────────────────────────
function renderStockTable(products, purchases) {
    const search = (document.getElementById('invSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('invStockFilter')?.value || 'all';

    let list = products.filter(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const min   = p.minStock ?? 0;
        const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.sku || '').toLowerCase().includes(search);
        let matchFilter = true;
        if (filter === 'low') matchFilter = min > 0 && stock <= min && stock > 0;
        if (filter === 'out') matchFilter = stock === 0;
        if (filter === 'ok')  matchFilter = min === 0 || stock > min;
        return matchSearch && matchFilter;
    });

    const tbody = document.getElementById('invTableBody');
    const empty = document.getElementById('invEmpty');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const min   = p.minStock ?? 0;
        const isOut = stock === 0;
        const isLow = !isOut && min > 0 && stock <= min;

        const latestBuy = purchases.filter(b => b.productId === p.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const unitCost = latestBuy ? Number(latestBuy.purchasePrice) : 0;
        const estValue = (stock * unitCost).toFixed(2);

        const barMax  = min > 0 ? min * 3 : Math.max(stock, 10);
        const barPct  = Math.min((stock / barMax) * 100, 100);
        const barCls  = isOut ? 'slb-out' : (isLow ? 'slb-low' : 'slb-healthy');

        const statusBadge = isOut
            ? `<span class="stock-badge stock-out"><i class="fas fa-times-circle"></i> Out of Stock</span>`
            : isLow
            ? `<span class="stock-badge stock-low"><i class="fas fa-exclamation-triangle"></i> ${stock} ${p.unit} · Low</span>`
            : `<span class="stock-badge stock-healthy"><i class="fas fa-check-circle"></i> ${stock} ${p.unit}</span>`;

        return `<tr>
            <td><strong>${p.name}</strong></td>
            <td><code style="font-size:0.78rem;background:var(--input-bg);padding:2px 6px;border-radius:5px;">${p.sku}</code></td>
            <td>${p.category || '—'}</td>
            <td>${p.unit}</td>
            <td>${statusBadge}</td>
            <td>${min > 0 ? min + ' ' + p.unit : '—'}</td>
            <td>
                <div class="stock-level-bar">
                    <div class="slb-track"><div class="slb-fill ${barCls}" style="width:${barPct}%"></div></div>
                    <span class="slb-label">${Math.round(barPct)}%</span>
                </div>
            </td>
            <td>${unitCost > 0 ? '₹' + estValue : '—'}</td>
            <td>
                <button class="btn btn-edit" style="font-size:0.78rem;padding:5px 10px;" onclick="quickAdjust('${p.id}')">
                    <i class="fas fa-edit"></i> Adjust
                </button>
                <a href="buy.html" class="btn btn-secondary" style="font-size:0.78rem;padding:5px 10px;text-decoration:none;">
                    <i class="fas fa-cart-plus"></i>
                </a>
            </td>
        </tr>`;
    }).join('');
}

// ── Movement history ──────────────────────────────────────────
function renderMovement(purchases) {
    const list = document.getElementById('movementList');
    if (!list) return;

    // Sales data from completed orders
    const orders = Storage.get('bb-orders') || [];
    const completedOrders = orders.filter(o => o.status === 'completed');

    const all = [
        ...purchases.map(p => ({ type: 'in',  title: `Restocked: ${p.productName}`, meta: `Qty +${p.quantity} | ₹${Number(p.purchasePrice).toFixed(2)}/unit${p.supplier ? ' | ' + p.supplier : ''}`, date: p.date, qty: p.quantity })),
        ...completedOrders.flatMap(o =>
            (o.items || []).map(item => ({
                type: 'out',
                title: `Sold: ${item.productName} (Order ${o.orderId})`,
                meta: `Qty −${item.qty} | ₹${Number(item.price || 0).toFixed(2)}/unit | Customer: ${o.customer || 'N/A'}`,
                date: o.completedAt || o.date,
                qty: -item.qty
            }))
        )
    ];

    const adjustments = Storage.get(ADJ_KEY) || [];
    adjustments.forEach(a => all.push({
        type: 'adj', title: `Adjusted: ${a.productName}`, meta: `Reason: ${a.reason}${a.notes ? ' — ' + a.notes : ''}`, date: a.date, qty: a.change
    }));

    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
        list.innerHTML = '<p class="empty-text">No stock movements recorded yet.</p>';
        return;
    }

    list.innerHTML = all.slice(0, 50).map(m => {
        const timeStr = new Date(m.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const qtyStr  = (m.qty > 0 ? '+' : '') + m.qty;
        const qtyCls  = m.qty >= 0 ? 'pos' : 'neg';
        return `<div class="move-item">
            <div class="move-icon ${m.type}"><i class="fas ${m.type === 'in' ? 'fa-arrow-down' : m.type === 'out' ? 'fa-arrow-up' : 'fa-sliders-h'}"></i></div>
            <div class="move-body">
                <div class="move-title">${m.title}</div>
                <div class="move-meta">${m.meta} · ${timeStr}</div>
            </div>
            <div class="move-qty ${qtyCls}">${qtyStr}</div>
        </div>`;
    }).join('');
}

// ── Adjustments tab ───────────────────────────────────────────
function renderAdjustments() {
    const list = document.getElementById('adjustmentsList');
    if (!list) return;
    const adjs = (Storage.get(ADJ_KEY) || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (adjs.length === 0) {
        list.innerHTML = '<p class="empty-text">No adjustments recorded yet.</p>';
        return;
    }
    list.innerHTML = adjs.map(a => {
        const timeStr = new Date(a.date).toLocaleString('en-IN');
        const sign    = a.change > 0 ? '+' : '';
        return `<div class="move-item">
            <div class="move-icon adj"><i class="fas fa-sliders-h"></i></div>
            <div class="move-body">
                <div class="move-title">${a.productName} <span style="font-weight:400;color:var(--text-faint);font-size:0.82rem;">${a.sku}</span></div>
                <div class="move-meta">Reason: ${a.reason}${a.notes ? ' — ' + a.notes : ''} · ${timeStr}</div>
                <div class="move-meta">Before: ${a.before} → After: ${a.after}</div>
            </div>
            <div class="move-qty ${a.change >= 0 ? 'pos' : 'neg'}">${sign}${a.change}</div>
        </div>`;
    }).join('');
}

// ── Bind UI ───────────────────────────────────────────────────
function bindInventoryUI() {
    // Tabs
    document.querySelectorAll('.inv-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;

            document.getElementById('tab-stock').style.display      = currentTab === 'stock'       ? '' : 'none';
            document.getElementById('tab-movement').style.display   = currentTab === 'movement'    ? '' : 'none';
            document.getElementById('tab-adjustments').style.display= currentTab === 'adjustments' ? '' : 'none';

            await loadInventory();
        });
    });

    // Search / filter
    document.getElementById('invSearch')?.addEventListener('input', async () => {
        const [products, purchases] = await Promise.all([DB.getProducts(), DB.getPurchases()]);
        renderStockTable(products, purchases);
    });
    document.getElementById('invStockFilter')?.addEventListener('change', async () => {
        const [products, purchases] = await Promise.all([DB.getProducts(), DB.getPurchases()]);
        renderStockTable(products, purchases);
    });

    // Adjust modal
    document.getElementById('adjustStockBtn')?.addEventListener('click', () => openAdjustModal());
    document.getElementById('closeAdjustModal')?.addEventListener('click', closeAdjustModal);
    document.getElementById('cancelAdjBtn')?.addEventListener('click', closeAdjustModal);
    document.getElementById('adjustModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeAdjustModal(); });

    // Reason chips
    document.querySelectorAll('.adj-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.adj-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            document.getElementById('adjReason').value = chip.dataset.reason;
        });
    });

    // Live preview
    ['adjProduct','adjType','adjQty'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateAdjPreview);
        document.getElementById(id)?.addEventListener('input',  updateAdjPreview);
    });

    // Form submit
    document.getElementById('adjustForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        await applyAdjustment();
    });

    // Populate product dropdown
    populateAdjProductDropdown();
}

async function populateAdjProductDropdown(preselect) {
    const products = await DB.getProducts();
    const sel = document.getElementById('adjProduct');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select product...</option>';
    products.forEach(p => {
        const stock = p.currentStock ?? p.stock ?? 0;
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.dataset.stock = stock;
        opt.dataset.unit  = p.unit;
        opt.dataset.sku   = p.sku;
        opt.dataset.name  = p.name;
        opt.textContent = `${p.name} (${stock} ${p.unit})`;
        if (preselect === p.id) opt.selected = true;
        sel.appendChild(opt);
    });
    if (preselect) updateAdjPreview();
}

window.quickAdjust = function(productId) {
    openAdjustModal(productId);
};

function openAdjustModal(preselect) {
    document.getElementById('adjustForm')?.reset();
    document.getElementById('adjPreview').style.display = 'none';
    document.querySelectorAll('.adj-chip').forEach(c => c.classList.remove('selected'));
    populateAdjProductDropdown(preselect);
    document.getElementById('adjustModal').classList.add('active');
}

function closeAdjustModal() {
    document.getElementById('adjustModal').classList.remove('active');
}

function updateAdjPreview() {
    const selEl  = document.getElementById('adjProduct');
    const selOpt = selEl?.options[selEl.selectedIndex];
    const type   = document.getElementById('adjType')?.value;
    const qty    = parseInt(document.getElementById('adjQty')?.value) || 0;
    const preview= document.getElementById('adjPreview');
    const previewText = document.getElementById('adjPreviewText');

    if (!selEl?.value || !qty || !type) {
        if (preview) preview.style.display = 'none';
        return;
    }

    const current  = parseInt(selOpt.dataset.stock) || 0;
    const unit     = selOpt.dataset.unit;
    let newStock;
    if (type === 'add')    newStock = current + qty;
    if (type === 'remove') newStock = Math.max(0, current - qty);
    if (type === 'set')    newStock = qty;

    const diff = newStock - current;
    if (preview) preview.style.display = 'block';
    if (previewText) previewText.innerHTML = `
        <strong>${selOpt.dataset.name}</strong> &nbsp;
        <span style="color:var(--text-faint);">Current: ${current} ${unit}</span> →
        <strong style="color:${diff >= 0 ? 'var(--success)' : 'var(--danger)'};">${newStock} ${unit}</strong>
        <span style="margin-left:8px; font-size:0.8rem; color:${diff >= 0 ? 'var(--success)' : 'var(--danger)'};">(${diff >= 0 ? '+' : ''}${diff})</span>`;
}

async function applyAdjustment() {
    const selEl   = document.getElementById('adjProduct');
    const selOpt  = selEl?.options[selEl.selectedIndex];
    const type    = document.getElementById('adjType').value;
    const qty     = parseInt(document.getElementById('adjQty').value) || 0;
    const reason  = document.getElementById('adjReason').value.trim();
    const notes   = document.getElementById('adjNotes').value.trim();

    if (!selEl?.value)  { showToast('Select a product', 'error'); return; }
    if (!qty || qty < 0){ showToast('Enter a valid quantity', 'error'); return; }
    if (!reason)        { showToast('Enter a reason', 'error'); return; }

    const current  = parseInt(selOpt.dataset.stock) || 0;
    let newStock;
    if (type === 'add')    newStock = current + qty;
    if (type === 'remove') newStock = Math.max(0, current - qty);
    if (type === 'set')    newStock = qty;

    const change = newStock - current;

    await DB.updateProductStock(selEl.value, newStock);

    // Log adjustment
    const adjs = Storage.get(ADJ_KEY) || [];
    adjs.unshift({
        id:          Date.now().toString(),
        productId:   selEl.value,
        productName: selOpt.dataset.name,
        sku:         selOpt.dataset.sku,
        before:      current,
        after:       newStock,
        change,
        type,
        reason,
        notes,
        date: new Date().toISOString()
    });
    Storage.set(ADJ_KEY, adjs);

    closeAdjustModal();
    await loadInventory();
    showToast(`Stock adjusted: ${selOpt.dataset.name} ${current} → ${newStock} ${selOpt.dataset.unit}`, 'success');
}
