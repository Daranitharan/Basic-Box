// ============================================================
//  commission.js  –  Commission & Earnings Calculation
//  BILLAXIS Phase 2 - Business Logic
// ============================================================

// Default rates (overridden by Supabase commission_settings)
const DEFAULT_COMMISSION = {
    commission_pct:        15,   // % platform takes from subtotal
    delivery_share_pct:    100,  // % of delivery fee merchant keeps
    payment_gateway_pct:   2     // % payment processing fee
};

class CommissionCalculator {

    // ── Fetch commission settings for current merchant ────────
    static async getSettings(merchantId = null) {
        const sb = getSupabase();
        if (!sb) return DEFAULT_COMMISSION;

        const uid = merchantId || (await getSupabaseUserId());
        if (!uid) return DEFAULT_COMMISSION;

        const { data, error } = await sb
            .from('commission_settings')
            .select('*')
            .eq('merchant_id', uid)
            .eq('is_active', true)
            .maybeSingle();

        if (error || !data) return DEFAULT_COMMISSION;

        return {
            commission_pct:      data.commission_percentage      ?? DEFAULT_COMMISSION.commission_pct,
            delivery_share_pct:  data.delivery_fee_share_percentage ?? DEFAULT_COMMISSION.delivery_share_pct,
            payment_gateway_pct: data.payment_gateway_fee_percentage ?? DEFAULT_COMMISSION.payment_gateway_pct
        };
    }

    // ── Calculate breakdown for a single order ────────────────
    // Returns a plain object - safe to display in UI
    static async calculateBreakdown(order, merchantId = null) {
        const settings = await this.getSettings(merchantId);

        const subtotal    = Number(order.subtotal     || order.total || 0);
        const deliveryFee = Number(order.delivery_fee || order.deliveryFee || 0);

        const commissionAmt       = (subtotal    * settings.commission_pct)      / 100;
        const deliveryShare       = (deliveryFee * settings.delivery_share_pct)  / 100;
        const paymentGatewayFee   = (subtotal    * settings.payment_gateway_pct) / 100;

        const merchantEarnings    = subtotal - commissionAmt - paymentGatewayFee + deliveryShare;
        const platformEarnings    = commissionAmt + deliveryFee - deliveryShare;

        return {
            subtotal,
            deliveryFee,
            commissionPct:        settings.commission_pct,
            commissionAmt:        round2(commissionAmt),
            deliverySharePct:     settings.delivery_share_pct,
            deliveryShare:        round2(deliveryShare),
            paymentGatewayPct:    settings.payment_gateway_pct,
            paymentGatewayFee:    round2(paymentGatewayFee),
            merchantEarnings:     round2(merchantEarnings),
            platformEarnings:     round2(platformEarnings)
        };
    }

    // ── Save commission data back to the order row ────────────
    static async saveToOrder(orderId, merchantId = null) {
        const sb = getSupabase();
        if (!sb) return;

        // Fetch order
        const { data: order } = await sb
            .from('orders')
            .select('subtotal, delivery_fee')
            .eq('id', orderId)
            .single();

        if (!order) return;

        const bd = await this.calculateBreakdown(order, merchantId);

        await sb.from('orders').update({
            commission_amount:  bd.commissionAmt,
            merchant_earnings:  bd.merchantEarnings,
            platform_earnings:  bd.platformEarnings
        }).eq('id', orderId);

        return bd;
    }

    // ── Earnings summary for a date range ────────────────────
    static async getSummary(startDate, endDate, merchantId = null) {
        const sb = getSupabase();
        if (!sb) return null;

        const uid = merchantId || (await getSupabaseUserId());
        if (!uid) return null;

        const { data: orders, error } = await sb
            .from('orders')
            .select('subtotal, delivery_fee, commission_amount, merchant_earnings, platform_earnings')
            .eq('user_id', uid)
            .eq('status', 'delivered')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error || !orders) return null;

        return orders.reduce((acc, o) => {
            acc.totalOrders      += 1;
            acc.grossSales       += Number(o.subtotal           || 0);
            acc.deliveryFees     += Number(o.delivery_fee       || 0);
            acc.totalCommission  += Number(o.commission_amount  || 0);
            acc.netEarnings      += Number(o.merchant_earnings  || 0);
            acc.platformRevenue  += Number(o.platform_earnings  || 0);
            return acc;
        }, {
            totalOrders:     0,
            grossSales:      0,
            deliveryFees:    0,
            totalCommission: 0,
            netEarnings:     0,
            platformRevenue: 0
        });
    }

    // ── Build HTML breakdown card ─────────────────────────────
    static renderBreakdownHTML(bd) {
        return `
<div class="commission-card">
    <div class="commission-row">
        <span>Order Value</span>
        <span>₹${bd.subtotal.toFixed(2)}</span>
    </div>
    <div class="commission-row">
        <span>Delivery Fee</span>
        <span>₹${bd.deliveryFee.toFixed(2)}</span>
    </div>
    <div class="commission-divider"></div>
    <div class="commission-row deduction">
        <span>Platform Commission (${bd.commissionPct}%)</span>
        <span>− ₹${bd.commissionAmt.toFixed(2)}</span>
    </div>
    <div class="commission-row deduction">
        <span>Payment Gateway (${bd.paymentGatewayPct}%)</span>
        <span>− ₹${bd.paymentGatewayFee.toFixed(2)}</span>
    </div>
    <div class="commission-row addition">
        <span>Delivery Share (${bd.deliverySharePct}%)</span>
        <span>+ ₹${bd.deliveryShare.toFixed(2)}</span>
    </div>
    <div class="commission-divider"></div>
    <div class="commission-row total">
        <strong>Your Net Earnings</strong>
        <strong class="earnings-value">₹${bd.merchantEarnings.toFixed(2)}</strong>
    </div>
</div>`;
    }
}

// Utility
function round2(n) { return Math.round(n * 100) / 100; }

console.log('💰 CommissionCalculator loaded');
