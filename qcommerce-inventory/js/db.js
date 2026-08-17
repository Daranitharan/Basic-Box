// ============================================================
//  db.js  –  Supabase Database Layer for Basics Box
//
//  This file wraps all Supabase calls and falls back to
//  localStorage when Supabase is not yet configured.
//
//  Load order in HTML (MUST be before auth.js / app.js):
//    config.js  →  db.js  →  storage.js  →  auth.js  →  app.js
// ============================================================

// Supabase client (initialised once config is filled in)
let _supabase = null;

function getSupabase() {
    if (_supabase) return _supabase;

    if (!supabaseConfigured()) return null;

    // Supabase v2 CDN is loaded via <script> in the HTML pages.
    // If the global is available, create the client.
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return _supabase;
    }

    return null;
}

// ── Helpers ─────────────────────────────────────────────────

// Convert camelCase JS keys  → snake_case DB columns
function toSnake(obj) {
    const map = {
        productId:     'product_id',
        productName:   'product_name',
        userId:        'user_id',
        minStock:      'min_stock',
        currentStock:  'current_stock',
        purchasePrice: 'purchase_price',
        totalCost:     'total_cost',
        sellingPrice:  'selling_price',
        totalAmount:   'total_amount',
        costPrice:     'cost_price',
        createdAt:     'created_at',
        updatedAt:     'updated_at'
    };
    const result = {};
    Object.keys(obj).forEach(k => {
        result[map[k] || k] = obj[k];
    });
    return result;
}

// Convert snake_case DB columns → camelCase JS keys
function toCamel(obj) {
    const map = {
        product_id:     'productId',
        product_name:   'productName',
        user_id:        'userId',
        min_stock:      'minStock',
        current_stock:  'currentStock',
        purchase_price: 'purchasePrice',
        total_cost:     'totalCost',
        selling_price:  'sellingPrice',
        total_amount:   'totalAmount',
        cost_price:     'costPrice',
        created_at:     'createdAt',
        updated_at:     'updatedAt'
    };
    const result = {};
    Object.keys(obj).forEach(k => {
        result[map[k] || k] = obj[k];
    });
    return result;
}

function rowsToCamel(rows) {
    return (rows || []).map(toCamel);
}

// Get the logged-in Supabase user id (null if not using Supabase)
async function getSupabaseUserId() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user ? user.id : null;
}

// ============================================================
//  DB  –  main public interface (mirrors Storage keys)
// ============================================================
const DB = {

    // ── Products ──────────────────────────────────────────────

    async getProducts() {
        const sb = getSupabase();
        if (!sb) return Storage.get('products') || [];

        const uid = await getSupabaseUserId();
        const { data, error } = await sb
            .from('products')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) { console.error('DB.getProducts:', error); return Storage.get('products') || []; }

        const products = rowsToCamel(data);
        Storage.set('products', products); // keep local cache in sync
        return products;
    },

    async saveProduct(product) {
        const sb = getSupabase();

        if (!sb) {
            // localStorage only
            let products = Storage.get('products') || [];
            const idx = products.findIndex(p => p.id === product.id);
            if (idx !== -1) products[idx] = { ...products[idx], ...product };
            else products.push(product);
            Storage.set('products', products);
            return { ok: true };
        }

        const uid = await getSupabaseUserId();
        const row = toSnake({ ...product, userId: uid });

        const { error } = await sb
            .from('products')
            .upsert(row, { onConflict: 'id' });

        if (error) { console.error('DB.saveProduct:', error); return { ok: false, error }; }

        // Update local cache
        let products = Storage.get('products') || [];
        const idx = products.findIndex(p => p.id === product.id);
        if (idx !== -1) products[idx] = { ...products[idx], ...product };
        else products.push(product);
        Storage.set('products', products);

        return { ok: true };
    },

    async deleteProduct(id) {
        const sb = getSupabase();

        if (!sb) {
            let products = Storage.get('products') || [];
            Storage.set('products', products.filter(p => p.id !== id));
            return { ok: true };
        }

        const { error } = await sb.from('products').delete().eq('id', id);
        if (error) { console.error('DB.deleteProduct:', error); return { ok: false, error }; }

        let products = Storage.get('products') || [];
        Storage.set('products', products.filter(p => p.id !== id));
        return { ok: true };
    },

    async updateProductStock(productId, newStock) {
        const sb = getSupabase();

        // Always update local cache
        let products = Storage.get('products') || [];
        const idx = products.findIndex(p => p.id === productId);
        if (idx !== -1) {
            products[idx].currentStock = newStock;
            products[idx].stock = newStock;
            Storage.set('products', products);
        }

        if (!sb) return { ok: true };

        const { error } = await sb
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', productId);

        if (error) { console.error('DB.updateProductStock:', error); return { ok: false, error }; }
        return { ok: true };
    },

    // ── Purchases ─────────────────────────────────────────────

    async getPurchases() {
        const sb = getSupabase();
        if (!sb) return Storage.get('purchases') || [];

        const uid = await getSupabaseUserId();
        const { data, error } = await sb
            .from('purchases')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: false });

        if (error) { console.error('DB.getPurchases:', error); return Storage.get('purchases') || []; }

        const purchases = rowsToCamel(data);
        Storage.set('purchases', purchases);
        return purchases;
    },

    async savePurchase(purchase) {
        const sb = getSupabase();

        if (!sb) {
            let purchases = Storage.get('purchases') || [];
            purchases.unshift(purchase);
            Storage.set('purchases', purchases);
            return { ok: true };
        }

        const uid = await getSupabaseUserId();
        const row = toSnake({ ...purchase, userId: uid });

        const { error } = await sb.from('purchases').insert(row);
        if (error) { console.error('DB.savePurchase:', error); return { ok: false, error }; }

        let purchases = Storage.get('purchases') || [];
        purchases.unshift(purchase);
        Storage.set('purchases', purchases);
        return { ok: true };
    },

    // ── Sales ─────────────────────────────────────────────────

    async getSales() {
        const sb = getSupabase();
        if (!sb) return Storage.get('sales') || [];

        const uid = await getSupabaseUserId();
        const { data, error } = await sb
            .from('sales')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: false });

        if (error) { console.error('DB.getSales:', error); return Storage.get('sales') || []; }

        const sales = rowsToCamel(data);
        Storage.set('sales', sales);
        return sales;
    },

    async saveSale(sale) {
        const sb = getSupabase();

        if (!sb) {
            let sales = Storage.get('sales') || [];
            sales.unshift(sale);
            Storage.set('sales', sales);
            return { ok: true };
        }

        const uid = await getSupabaseUserId();
        const row = toSnake({ ...sale, userId: uid });

        const { error } = await sb.from('sales').insert(row);
        if (error) { console.error('DB.saveSale:', error); return { ok: false, error }; }

        let sales = Storage.get('sales') || [];
        sales.unshift(sale);
        Storage.set('sales', sales);
        return { ok: true };
    },

    // ── Orders ─────────────────────────────────────────────────

    async getOrders() {
        const sb  = getSupabase();
        const key = 'bb-orders';
        if (!sb) return Storage.get(key) || [];

        const uid = await getSupabaseUserId();
        const { data, error } = await sb
            .from('orders')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: false });

        if (error) { console.error('DB.getOrders:', error); return Storage.get(key) || []; }

        // Convert snake_case DB → camelCase JS manually for orders
        const orders = (data || []).map(row => ({
            id:            row.id,
            orderId:       row.order_id_label,
            orderType:     row.order_type   || 'offline',
            customer:      row.customer     || '',
            phone:         row.phone        || '',
            address:       row.address      || '',
            items:         row.items        || [],
            subtotal:      Number(row.subtotal    || 0),
            totalCost:     Number(row.total_cost  || 0),
            profit:        Number(row.profit      || 0),
            deliveryFee:   Number(row.delivery_fee|| 0),
            total:         Number(row.total       || 0),
            payment:       row.payment       || 'cash',
            paymentStatus: row.payment_status|| 'pending',
            status:        row.status        || 'new',
            timeline:      row.timeline      || [],
            notes:         row.notes         || '',
            date:          row.date,
            completedAt:   row.completed_at  || null,
        }));

        Storage.set(key, orders);
        return orders;
    },

    async saveOrder(order) {
        const sb  = getSupabase();
        const key = 'bb-orders';

        // Always update local cache
        let orders = Storage.get(key) || [];
        const idx  = orders.findIndex(o => o.id === order.id);
        if (idx !== -1) orders[idx] = { ...orders[idx], ...order };
        else orders.unshift(order);
        Storage.set(key, orders);

        if (!sb) return { ok: true };

        const uid = await getSupabaseUserId();
        const row = {
            id:             order.id,
            user_id:        uid,
            order_id_label: order.orderId,
            order_type:     order.orderType     || 'offline',
            customer:       order.customer      || '',
            phone:          order.phone         || '',
            address:        order.address       || '',
            items:          order.items         || [],
            subtotal:       order.subtotal       || 0,
            total_cost:     order.totalCost      || 0,
            profit:         order.profit         || 0,
            delivery_fee:   order.deliveryFee    || 0,
            total:          order.total          || 0,
            payment:        order.payment        || 'cash',
            payment_status: order.paymentStatus  || 'pending',
            status:         order.status         || 'new',
            timeline:       order.timeline       || [],
            notes:          order.notes          || '',
            date:           order.date,
            completed_at:   order.completedAt    || null,
        };

        const { error } = await sb.from('orders').upsert(row, { onConflict: 'id' });
        if (error) { console.error('DB.saveOrder:', error); return { ok: false, error }; }
        return { ok: true };
    },

    async updateOrderStatus(orderId, status, extra = {}) {
        const sb  = getSupabase();
        const key = 'bb-orders';

        let orders = Storage.get(key) || [];
        const idx  = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return { ok: false, error: 'Order not found' };

        orders[idx] = { ...orders[idx], status, ...extra };
        Storage.set(key, orders);

        if (!sb) return { ok: true };

        const updateData = { status, ...( extra.completedAt ? { completed_at: extra.completedAt } : {} ) };
        const { error } = await sb.from('orders').update(updateData).eq('id', orderId);
        if (error) { console.error('DB.updateOrderStatus:', error); return { ok: false, error }; }
        return { ok: true };
    }
};
