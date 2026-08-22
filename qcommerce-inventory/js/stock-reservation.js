// ============================================================
//  stock-reservation.js  –  Real-time Stock Reservation
//  BILLAXIS Phase 2 - Prevent Overselling
// ============================================================

class StockReservation {

    // ── Reserve stock when order is placed ───────────────────
    static async reserveStock(productId, quantity, orderId = null) {
        const sb = getSupabase();

        // --- Supabase path ---
        if (sb) {
            const uid = await getSupabaseUserId();

            // Check current available stock
            const { data: product, error: pErr } = await sb
                .from('products')
                .select('current_stock, reserved_stock, product_name')
                .eq('id', productId)
                .single();

            if (pErr || !product) {
                return { ok: false, error: 'Product not found' };
            }

            const reserved  = product.reserved_stock || 0;
            const available = product.current_stock - reserved;

            if (available < quantity) {
                return {
                    ok:        false,
                    error:     `Only ${available} item${available !== 1 ? 's' : ''} available`,
                    available: available
                };
            }

            // Write reservation row
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-min hold

            const { data: res, error: rErr } = await sb
                .from('stock_reservations')
                .insert({
                    product_id: productId,
                    order_id:   orderId,
                    user_id:    uid,
                    quantity,
                    expires_at: expiresAt.toISOString(),
                    status:     'reserved'
                })
                .select()
                .single();

            if (rErr) {
                console.error('StockReservation.reserveStock (insert):', rErr);
                return { ok: false, error: rErr.message };
            }

            // Increment reserved_stock on product
            await sb
                .from('products')
                .update({ reserved_stock: reserved + quantity })
                .eq('id', productId);

            return { ok: true, reservation: res };
        }

        // --- localStorage fallback ---
        const products = Storage.get('products') || [];
        const idx      = products.findIndex(p => p.id === productId);
        if (idx === -1) return { ok: false, error: 'Product not found' };

        const prod      = products[idx];
        const reserved  = prod.reservedStock || 0;
        const available = (prod.currentStock || prod.stock || 0) - reserved;

        if (available < quantity) {
            return { ok: false, error: `Only ${available} available`, available };
        }

        products[idx].reservedStock = reserved + quantity;
        Storage.set('products', products);

        const fakeRes = { id: `local-${Date.now()}`, productId, quantity };
        return { ok: true, reservation: fakeRes };
    }

    // ── Confirm reservation (order confirmed / paid) ─────────
    static async confirmReservation(reservationId) {
        const sb = getSupabase();
        if (!sb) return { ok: true }; // nothing extra needed locally

        const { error } = await sb
            .from('stock_reservations')
            .update({ status: 'confirmed' })
            .eq('id', reservationId);

        if (error) console.error('confirmReservation:', error);
        return { ok: !error };
    }

    // ── Release reservation (cancel / cart timeout) ──────────
    static async releaseReservation(reservationId) {
        const sb = getSupabase();
        if (!sb) return { ok: true };

        // Fetch the reservation
        const { data: res } = await sb
            .from('stock_reservations')
            .select('product_id, quantity')
            .eq('id', reservationId)
            .single();

        if (!res) return { ok: false };

        // Mark as released
        await sb
            .from('stock_reservations')
            .update({ status: 'released' })
            .eq('id', reservationId);

        // Decrease reserved_stock
        const { data: product } = await sb
            .from('products')
            .select('reserved_stock')
            .eq('id', res.product_id)
            .single();

        if (product) {
            await sb
                .from('products')
                .update({ reserved_stock: Math.max(0, (product.reserved_stock || 0) - res.quantity) })
                .eq('id', res.product_id);
        }

        return { ok: true };
    }

    // ── Auto-release expired reservations ────────────────────
    static async releaseExpiredReservations() {
        const sb = getSupabase();
        if (!sb) return;

        const now = new Date().toISOString();
        const { data: expired } = await sb
            .from('stock_reservations')
            .select('id')
            .eq('status', 'reserved')
            .lt('expires_at', now);

        if (!expired || expired.length === 0) return;

        await Promise.all(expired.map(r => this.releaseReservation(r.id)));
        console.log(`🔓 Released ${expired.length} expired stock reservation(s)`);
    }

    // ── Get available (unreserved) stock ─────────────────────
    static async getAvailableStock(productId) {
        const sb = getSupabase();
        if (!sb) {
            const products = Storage.get('products') || [];
            const p = products.find(x => x.id === productId);
            if (!p) return 0;
            return Math.max(0, (p.currentStock || p.stock || 0) - (p.reservedStock || 0));
        }

        const { data: product } = await sb
            .from('products')
            .select('current_stock, reserved_stock')
            .eq('id', productId)
            .single();

        if (!product) return 0;
        return Math.max(0, product.current_stock - (product.reserved_stock || 0));
    }

    // ── UI helper: stock badge text ──────────────────────────
    static stockBadge(available, threshold = 5) {
        if (available <= 0)           return { text: 'Out of Stock',    cls: 'badge-danger'  };
        if (available <= threshold)   return { text: `Only ${available} left`, cls: 'badge-warning' };
        return { text: `${available} in stock`, cls: 'badge-success' };
    }
}

// Auto-release expired reservations every 2 minutes
setInterval(() => StockReservation.releaseExpiredReservations(), 120_000);

console.log('📦 StockReservation loaded');
