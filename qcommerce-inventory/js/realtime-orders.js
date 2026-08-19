// ============================================================
//  realtime-orders.js — Realtime Order Notifications System
//  
//  Subscribes to new orders via Supabase Realtime and provides
//  instant notifications to merchants when customers place orders
// ============================================================

class OrderRealtimeManager {
    constructor() {
        this.subscription = null;
        this.notificationSound = null;
        this.isInitialized = false;
    }

    async init() {
        const supabase = getSupabase();
        if (!supabase) {
            console.warn('Supabase not configured. Realtime orders disabled.');
            return;
        }

        const userId = await getSupabaseUserId();
        if (!userId) {
            console.warn('No user logged in. Realtime orders disabled.');
            return;
        }

        // Create notification sound using Web Audio API (no file needed)
        this.audioContext = null;
        this.notificationSound = null;

        // Request notification permission
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        console.log('🔔 Initializing realtime order notifications for merchant:', userId);

        // Subscribe to orders table changes for this merchant
        this.subscription = supabase
            .channel('merchant-orders-' + userId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `merchant_id=eq.${userId}`
                },
                (payload) => {
                    console.log('🆕 New order received:', payload.new);
                    this.handleNewOrder(payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `merchant_id=eq.${userId}`
                },
                (payload) => {
                    console.log('📝 Order updated:', payload.new);
                    this.handleOrderUpdate(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    this.isInitialized = true;
                    console.log('✅ Realtime order notifications active');
                }
            });
    }

    async handleNewOrder(orderData) {
        // Convert DB format to app format
        const order = this.convertOrderFromDB(orderData);

        // Play notification sound
        this.playNotificationSound();

        // Show browser notification
        this.showBrowserNotification(order);

        // Show in-app toast
        if (typeof showToast === 'function') {
            showToast(
                `🎉 New Order! #${order.orderId} - ₹${Number(order.total).toFixed(2)}`,
                'success',
                5000
            );
        }

        // Update order badge count
        this.updateOrderBadge();

        // Create in-app notification
        await this.createInAppNotification(order);

        // Refresh orders list if on orders page
        if (window.location.pathname.includes('orders.html')) {
            this.refreshOrdersList();
        }

        // Trigger dashboard refresh if on dashboard
        if (window.location.pathname.includes('merchant.html')) {
            if (typeof window.triggerDashboardRefresh === 'function') {
                window.triggerDashboardRefresh();
            }
        }
    }

    handleOrderUpdate(orderData) {
        const order = this.convertOrderFromDB(orderData);

        console.log('Order status updated:', order.status);

        // Refresh orders list if on orders page
        if (window.location.pathname.includes('orders.html')) {
            this.refreshOrdersList();
        }

        // Update order badge
        this.updateOrderBadge();
    }

    playNotificationSound() {
        try {
            // Create AudioContext if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const ctx = this.audioContext;
            const now = ctx.currentTime;

            // Create oscillator for pleasant notification sound
            const oscillator1 = ctx.createOscillator();
            const oscillator2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Configure first tone (E note)
            oscillator1.type = 'sine';
            oscillator1.frequency.value = 659.25; // E5

            // Configure second tone (G# note for harmony)
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 830.61; // G#5

            // Envelope for smooth sound
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            // Play sound
            oscillator1.start(now);
            oscillator2.start(now);
            oscillator1.stop(now + 0.4);
            oscillator2.stop(now + 0.4);

            console.log('🔔 Notification sound played');
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    showBrowserNotification(order) {
        if (Notification.permission !== 'granted') return;

        const notification = new Notification('🎉 New Order Received!', {
            body: `Order #${order.orderId} - ${order.customer || 'Customer'}\nAmount: ₹${Number(order.total).toFixed(2)}`,
            icon: '../assets/billaxis-icon.svg',
            badge: '../assets/billaxis-icon.svg',
            tag: 'billaxis-order-' + order.id,
            requireInteraction: true,
            silent: false
        });

        notification.onclick = () => {
            window.focus();
            window.location.href = 'pages/orders.html?highlight=' + order.id;
            notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }

    async createInAppNotification(order) {
        const notification = {
            id: Date.now().toString(),
            userId: order.merchantId || order.userId,
            type: 'order_new',
            title: 'New Order Received!',
            message: `Order #${order.orderId} from ${order.customer || 'Customer'} - ₹${Number(order.total).toFixed(2)}`,
            data: {
                orderId: order.id,
                orderLabel: order.orderId,
                total: order.total
            },
            isRead: false,
            createdAt: new Date().toISOString()
        };

        // Save to Supabase notifications table (if exists)
        const supabase = getSupabase();
        if (supabase) {
            try {
                await supabase.from('notifications').insert({
                    id: notification.id,
                    user_id: notification.userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    is_read: notification.isRead,
                    created_at: notification.createdAt
                });
            } catch (error) {
                console.warn('Could not save notification to DB:', error);
            }
        }

        // Update local notifications storage
        let notifications = Storage.get('bb-notifications') || [];
        notifications.unshift(notification);
        // Keep only last 100 notifications
        if (notifications.length > 100) notifications = notifications.slice(0, 100);
        Storage.set('bb-notifications', notifications);
    }

    updateOrderBadge() {
        // Count new orders
        const orders = Storage.get('bb-orders') || [];
        const newOrderCount = orders.filter(o => o.status === 'new').length;

        // Update all badge elements
        document.querySelectorAll('.order-badge, .notif-badge').forEach(badge => {
            if (newOrderCount > 0) {
                badge.textContent = newOrderCount > 99 ? '99+' : newOrderCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });

        // Update page title
        if (newOrderCount > 0) {
            document.title = `(${newOrderCount}) Billaxis | Orders`;
        } else {
            document.title = 'Billaxis | Merchant Dashboard';
        }
    }

    async refreshOrdersList() {
        if (typeof loadOrders === 'function') {
            await loadOrders();
        } else if (typeof window.loadOrdersData === 'function') {
            await window.loadOrdersData();
        }
        console.log('Orders list refreshed');
    }

    convertOrderFromDB(dbOrder) {
        return {
            id: dbOrder.id,
            orderId: dbOrder.order_id_label,
            orderType: dbOrder.order_type || 'offline',
            customer: dbOrder.customer || '',
            phone: dbOrder.phone || '',
            address: dbOrder.address || '',
            items: dbOrder.items || [],
            subtotal: Number(dbOrder.subtotal || 0),
            totalCost: Number(dbOrder.total_cost || 0),
            profit: Number(dbOrder.profit || 0),
            deliveryFee: Number(dbOrder.delivery_fee || 0),
            total: Number(dbOrder.total || 0),
            payment: dbOrder.payment || 'cash',
            paymentStatus: dbOrder.payment_status || 'pending',
            status: dbOrder.status || 'new',
            timeline: dbOrder.timeline || [],
            notes: dbOrder.notes || '',
            date: dbOrder.date,
            completedAt: dbOrder.completed_at || null,
            customerId: dbOrder.customer_id,
            merchantId: dbOrder.merchant_id || dbOrder.user_id,
            storeId: dbOrder.store_id,
            userId: dbOrder.user_id
        };
    }

    destroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            console.log('Realtime order notifications unsubscribed');
        }
        this.isInitialized = false;
    }
}

// ── Global instance ───────────────────────────────────────
let orderRealtimeManager = null;

// ── Auto-initialize on DOM ready ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Only init on merchant pages (not on auth pages)
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('register.html');
    
    if (!isAuthPage && supabaseConfigured()) {
        orderRealtimeManager = new OrderRealtimeManager();
        
        // Wait for auth to be ready
        setTimeout(async () => {
            const supabase = getSupabase();
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await orderRealtimeManager.init();
                }
            }
        }, 1000);
    }
});

// ── Cleanup on page unload ────────────────────────────────
window.addEventListener('beforeunload', () => {
    if (orderRealtimeManager) {
        orderRealtimeManager.destroy();
    }
});

// ── Export for global access ──────────────────────────────
window.OrderRealtimeManager = OrderRealtimeManager;
window.orderRealtimeManager = orderRealtimeManager;
