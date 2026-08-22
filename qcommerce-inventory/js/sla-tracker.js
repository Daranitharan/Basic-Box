// ============================================================
//  sla-tracker.js  –  SLA / Delivery Countdown Timer
//  BILLAXIS Phase 2 - Fulfillment Speed
// ============================================================

// Active timer instances: orderId → intervalId
const _slaTimers = {};

class SLATracker {

    // ── Compute expected delivery time ────────────────────────
    // Returns a Date object
    static calculateExpectedDelivery(distanceKm, prepMinutes = 20) {
        const travelMin = typeof LocationService !== 'undefined'
            ? LocationService.estimateDeliveryTime(distanceKm)
            : Math.ceil((distanceKm / 20) * 60); // fallback: 20 km/h

        const expected = new Date();
        expected.setMinutes(expected.getMinutes() + prepMinutes + travelMin);
        return expected;
    }

    // ── Render a live countdown into a DOM element ────────────
    // Returns the intervalId so the caller can clear it if needed.
    static startCountdown(orderId, expectedDeliveryTime, elementId) {
        // Clear any previous timer for this order
        this.stopCountdown(orderId);

        const deadline = expectedDeliveryTime instanceof Date
            ? expectedDeliveryTime
            : new Date(expectedDeliveryTime);

        const tick = () => {
            const el = document.getElementById(elementId);
            if (!el) { this.stopCountdown(orderId); return; }

            const remaining = deadline - Date.now();

            if (remaining <= 0) {
                el.innerHTML = '<span class="sla-delayed">⚠️ DELAYED</span>';
                this.stopCountdown(orderId);
                this._onDelay(orderId);
                return;
            }

            const totalMin = Math.floor(remaining / 60_000);
            const secs     = Math.floor((remaining % 60_000) / 1000);
            const hours    = Math.floor(totalMin / 60);
            const mins     = totalMin % 60;

            const display  = hours > 0
                ? `${hours}h ${mins}m`
                : `${mins}:${String(secs).padStart(2, '0')}`;

            let cls = 'sla-ok';
            if (totalMin < 5)  cls = 'sla-critical';
            else if (totalMin < 10) cls = 'sla-warning';

            el.innerHTML = `<span class="${cls}">${display}</span>`;
        };

        tick(); // immediate first render
        const id = setInterval(tick, 1000);
        _slaTimers[orderId] = id;
        return id;
    }

    // ── Stop a countdown ──────────────────────────────────────
    static stopCountdown(orderId) {
        if (_slaTimers[orderId]) {
            clearInterval(_slaTimers[orderId]);
            delete _slaTimers[orderId];
        }
    }

    // ── Stop ALL countdowns (e.g. on page unload) ─────────────
    static stopAll() {
        Object.keys(_slaTimers).forEach(id => this.stopCountdown(id));
    }

    // ── Called internally when an order goes past deadline ────
    static _onDelay(orderId) {
        console.warn(`⏰ Order ${orderId} is DELAYED`);
        // Show toast if available
        if (typeof showToast === 'function') {
            showToast(`Order #${orderId} is running late!`, 'warning');
        }
        // Persist delay flag to DB
        this.markOrderDelayed(orderId);
    }

    // ── Persist delay flag ────────────────────────────────────
    static async markOrderDelayed(orderId) {
        const sb = getSupabase();
        if (!sb) return;
        await sb.from('orders').update({ is_delayed: true }).eq('id', orderId);
    }

    // ── Log an order lifecycle event ──────────────────────────
    static async logEvent(orderId, eventType, description = '') {
        const sb = getSupabase();
        if (!sb) return;

        const uid = await getSupabaseUserId();
        const { error } = await sb.from('order_events').insert({
            order_id:          orderId,
            event_type:        eventType,
            event_description: description,
            triggered_by:      uid
        });

        if (error) console.error('SLATracker.logEvent:', error);
    }

    // ── Save expected delivery time to order row ──────────────
    static async setExpectedDelivery(orderId, expectedTime) {
        const sb = getSupabase();
        if (!sb) return;

        const ts = expectedTime instanceof Date
            ? expectedTime.toISOString()
            : expectedTime;

        await sb.from('orders')
            .update({ expected_delivery_time: ts })
            .eq('id', orderId);
    }

    // ── Format remaining time for display (static string) ─────
    static formatRemaining(expectedTime) {
        const remaining = new Date(expectedTime) - Date.now();
        if (remaining <= 0) return 'Delayed';
        const mins = Math.floor(remaining / 60_000);
        const secs = Math.floor((remaining % 60_000) / 1000);
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h}h ${m}m`;
        }
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }
}

// Clean up timers on page unload
window.addEventListener('beforeunload', () => SLATracker.stopAll());

console.log('⏱️  SLATracker loaded');
