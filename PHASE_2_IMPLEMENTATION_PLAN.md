# 🚀 BILLAXIS Q-COMMERCE - PHASE 2 IMPLEMENTATION PLAN

## 📋 Overview

This document provides a step-by-step implementation plan for enhancing your Q-Commerce platform with advanced features.

---

## 🎯 Implementation Priority

### **WAVE 1: Foundation (Week 1-2)**
1. Hyperlocal & Discovery
2. Inventory Reliability

### **WAVE 2: Operations (Week 3-4)**
3. Fulfillment Speed (SLA)
4. Business Logic (Commission)

### **WAVE 3: Growth (Week 5-6)**
5. Delivery Operations
6. Growth & Trust Features

### **WAVE 4: Polish (Week 7-8)**
7. Enhanced Notifications
8. Testing & Optimization

---

## 📂 File Structure

```
qcommerce-inventory/
├── js/
│   ├── location.js (NEW)          # Geolocation & distance calculation
│   ├── stock-reservation.js (NEW) # Stock management
│   ├── sla-tracker.js (NEW)       # SLA monitoring
│   ├── commission.js (NEW)        # Commission calculations
│   ├── delivery.js (NEW)          # Delivery management
│   ├── promo.js (NEW)             # Promo code logic
│   ├── reviews.js (NEW)           # Rating & review system
│   └── push-notifications.js (NEW)# Push notification handling
│
├── pages/
│   ├── store-setup.html (NEW)     # Merchant store configuration
│   ├── picker-view.html (NEW)     # Order picking interface
│   ├── rider-dashboard.html (NEW) # Rider app interface
│   └── live-tracking.html (NEW)   # Customer order tracking
│
└── edge-functions/ (NEW)
    ├── reserve-stock/
    ├── calculate-commission/
    ├── assign-rider/
    ├── send-notification/
    └── validate-promo/
```

---

## 🔧 WAVE 1: FOUNDATION

### Step 1.1: Run Database Schema

```sql
-- In Supabase SQL Editor
-- Run: PHASE_2_DATABASE_SCHEMA.sql
-- Then: PHASE_2_RLS_POLICIES.sql
```

### Step 1.2: Hyperlocal Discovery

**A. Add Geolocation Library**

Add to your HTML files:
```html
<script src="https://cdn.jsdelivr.net/npm/geolib@3.3.4/lib/index.min.js"></script>
```

**B. Create `js/location.js`:**

```javascript
// location.js - Geolocation & Distance Calculation

class LocationService {
    
    // Get user's current location
    static async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => reject(error),
                { 
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes cache
                }
            );
        });
    }
    
    // Calculate distance between two points (in km)
    static calculateDistance(lat1, lon1, lat2, lon2) {
        // Using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    static toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    // Estimate delivery time based on distance
    static estimateDeliveryTime(distanceKm) {
        // Assumptions:
        // - Preparation time: 15-20 minutes
        // - Delivery speed: ~20 km/h in city
        const preparationTime = 18; // minutes
        const deliverySpeed = 20; // km/h
        const deliveryTime = (distanceKm / deliverySpeed) * 60; // convert to minutes
        
        return Math.ceil(preparationTime + deliveryTime);
    }
    
    // Get nearby stores
    static async getNearbyStores(userLat, userLon, radiusKm = 10) {
        const sb = getSupabase();
        if (!sb) return [];
        
        // Get all active stores
        const { data: stores, error } = await sb
            .from('stores')
            .select('*')
            .eq('is_active', true)
            .eq('is_accepting_orders', true);
        
        if (error) {
            console.error('Error fetching stores:', error);
            return [];
        }
        
        // Calculate distance for each store
        const storesWithDistance = stores.map(store => {
            const distance = this.calculateDistance(
                userLat,
                userLon,
                store.latitude,
                store.longitude
            );
            
            return {
                ...store,
                distance_km: distance,
                estimated_delivery_minutes: this.estimateDeliveryTime(distance),
                is_serviceable: distance <= store.service_radius_km
            };
        });
        
        // Filter serviceable and sort by distance
        return storesWithDistance
            .filter(store => store.is_serviceable)
            .sort((a, b) => a.distance_km - b.distance_km);
    }
    
    // Check if location is serviceable
    static async checkServiceability(userLat, userLon, storeId) {
        const sb = getSupabase();
        if (!sb) return { serviceable: false };
        
        const { data: store } = await sb
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();
        
        if (!store) return { serviceable: false };
        
        const distance = this.calculateDistance(
            userLat,
            userLon,
            store.latitude,
            store.longitude
        );
        
        return {
            serviceable: distance <= store.service_radius_km,
            distance_km: distance,
            estimated_delivery_minutes: this.estimateDeliveryTime(distance)
        };
    }
}
```

**Usage Example:**
```javascript
// Get user location and find nearby stores
async function discoverNearbyStores() {
    try {
        const location = await LocationService.getCurrentLocation();
        const nearbyStores = await LocationService.getNearbyStores(
            location.latitude,
            location.longitude,
            10 // 10km radius
        );
        
        console.log('Nearby stores:', nearbyStores);
        // Display stores in UI
        displayStores(nearbyStores);
    } catch (error) {
        console.error('Location error:', error);
        showToast('Please enable location access', 'error');
    }
}
```

---

### Step 1.3: Stock Reservation System

**Create `js/stock-reservation.js`:**

```javascript
// stock-reservation.js - Prevent Overselling

class StockReservation {
    
    // Reserve stock when adding to cart/placing order
    static async reserveStock(productId, quantity, orderId = null) {
        const sb = getSupabase();
        if (!sb) return { ok: false, error: 'Supabase not configured' };
        
        const userId = await getSupabaseUserId();
        
        // Check available stock first
        const { data: product } = await sb
            .from('products')
            .select('current_stock, reserved_stock')
            .eq('id', productId)
            .single();
        
        if (!product) {
            return { ok: false, error: 'Product not found' };
        }
        
        const availableStock = product.current_stock - (product.reserved_stock || 0);
        
        if (availableStock < quantity) {
            return { 
                ok: false, 
                error: `Only ${availableStock} items available`,
                available: availableStock
            };
        }
        
        // Create reservation (expires in 15 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        
        const { data: reservation, error } = await sb
            .from('stock_reservations')
            .insert({
                product_id: productId,
                order_id: orderId,
                user_id: userId,
                quantity: quantity,
                expires_at: expiresAt.toISOString(),
                status: 'reserved'
            })
            .select()
            .single();
        
        if (error) {
            console.error('Reservation error:', error);
            return { ok: false, error: error.message };
        }
        
        // Update product reserved_stock
        await sb
            .from('products')
            .update({ 
                reserved_stock: (product.reserved_stock || 0) + quantity 
            })
            .eq('id', productId);
        
        return { ok: true, reservation };
    }
    
    // Confirm reservation (when order is confirmed)
    static async confirmReservation(reservationId) {
        const sb = getSupabase();
        if (!sb) return { ok: false };
        
        const { error } = await sb
            .from('stock_reservations')
            .update({ status: 'confirmed' })
            .eq('id', reservationId);
        
        return { ok: !error, error };
    }
    
    // Release reservation (on cart timeout or order cancel)
    static async releaseReservation(reservationId) {
        const sb = getSupabase();
        if (!sb) return { ok: false };
        
        // Get reservation details
        const { data: reservation } = await sb
            .from('stock_reservations')
            .select('product_id, quantity')
            .eq('id', reservationId)
            .single();
        
        if (!reservation) return { ok: false };
        
        // Update reservation status
        await sb
            .from('stock_reservations')
            .update({ status: 'released' })
            .eq('id', reservationId);
        
        // Decrease reserved_stock
        const { data: product } = await sb
            .from('products')
            .select('reserved_stock')
            .eq('id', reservation.product_id)
            .single();
        
        if (product) {
            await sb
                .from('products')
                .update({ 
                    reserved_stock: Math.max(0, (product.reserved_stock || 0) - reservation.quantity)
                })
                .eq('id', reservation.product_id);
        }
        
        return { ok: true };
    }
    
    // Auto-release expired reservations (run periodically)
    static async releaseExpiredReservations() {
        const sb = getSupabase();
        if (!sb) return;
        
        const now = new Date().toISOString();
        
        // Find expired reservations
        const { data: expired } = await sb
            .from('stock_reservations')
            .select('id, product_id, quantity')
            .eq('status', 'reserved')
            .lt('expires_at', now);
        
        if (!expired || expired.length === 0) return;
        
        // Release each expired reservation
        for (const reservation of expired) {
            await this.releaseReservation(reservation.id);
        }
        
        console.log(`Released ${expired.length} expired reservations`);
    }
    
    // Get available stock (considering reservations)
    static async getAvailableStock(productId) {
        const sb = getSupabase();
        if (!sb) return 0;
        
        const { data: product } = await sb
            .from('products')
            .select('current_stock, reserved_stock')
            .eq('id', productId)
            .single();
        
        if (!product) return 0;
        
        return product.current_stock - (product.reserved_stock || 0);
    }
}

// Auto-release expired reservations every 2 minutes
setInterval(() => {
    StockReservation.releaseExpiredReservations();
}, 120000);
```

**Usage in Order Flow:**
```javascript
// When user adds to cart
async function addToCart(productId, quantity) {
    const reservation = await StockReservation.reserveStock(productId, quantity);
    
    if (!reservation.ok) {
        showToast(reservation.error, 'error');
        if (reservation.available > 0) {
            showToast(`Only ${reservation.available} left in stock`, 'warning');
        }
        return;
    }
    
    // Add to cart with reservation ID
    cart.push({
        productId,
        quantity,
        reservationId: reservation.reservation.id
    });
    
    showToast('Added to cart', 'success');
}

// When order is placed
async function placeOrder(cart) {
    // Confirm all reservations
    for (const item of cart) {
        await StockReservation.confirmReservation(item.reservationId);
    }
    
    // Deduct actual stock
    // Create order
    // ...
}

// If user abandons cart
async function clearCart(cart) {
    // Release all reservations
    for (const item of cart) {
        await StockReservation.releaseReservation(item.reservationId);
    }
}
```

---

## 🔧 WAVE 2: OPERATIONS

### Step 2.1: SLA Tracking

**Create `js/sla-tracker.js`:**

```javascript
// sla-tracker.js - Delivery SLA Monitoring

class SLATracker {
    
    // Calculate expected delivery time
    static calculateExpectedDelivery(distanceKm, preparationTimeMinutes = 20) {
        const deliveryTimeMinutes = LocationService.estimateDeliveryTime(distanceKm);
        const totalMinutes = preparationTimeMinutes + deliveryTimeMinutes;
        
        const expectedTime = new Date();
        expectedTime.setMinutes(expectedTime.getMinutes() + totalMinutes);
        
        return {
            expectedDeliveryTime: expectedTime,
            totalMinutes,
            preparationMinutes: preparationTimeMinutes,
            deliveryMinutes: deliveryTimeMinutes
        };
    }
    
    // Create SLA countdown timer
    static createCountdownTimer(expectedDeliveryTime, elementId) {
        const updateTimer = () => {
            const now = new Date();
            const remaining = expectedDeliveryTime - now;
            
            if (remaining <= 0) {
                document.getElementById(elementId).innerHTML = 
                    '<span class="text-danger">⚠️ DELAYED</span>';
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            let color = 'text-success';
            if (minutes < 5) color = 'text-danger';
            else if (minutes < 10) color = 'text-warning';
            
            document.getElementById(elementId).innerHTML = 
                `<span class="${color}">${minutes}:${seconds.toString().padStart(2, '0')}</span>`;
        };
        
        updateTimer();
        return setInterval(updateTimer, 1000);
    }
    
    // Log order event
    static async logOrderEvent(orderId, eventType, description = '') {
        const sb = getSupabase();
        if (!sb) return;
        
        const userId = await getSupabaseUserId();
        
        await sb.from('order_events').insert({
            order_id: orderId,
            event_type: eventType,
            event_description: description,
            triggered_by: userId
        });
    }
    
    // Check if order is delayed
    static async checkAndMarkDelay(orderId) {
        const sb = getSupabase();
        if (!sb) return;
        
        const { data: order } = await sb
            .from('orders')
            .select('expected_delivery_time, status')
            .eq('id', orderId)
            .single();
        
        if (!order) return;
        
        const now = new Date();
        const expected = new Date(order.expected_delivery_time);
        
        if (now > expected && order.status !== 'delivered') {
            await sb
                .from('orders')
                .update({ is_delayed: true })
                .eq('id', orderId);
            
            // Send delay notification
            await this.sendDelayNotification(orderId);
        }
    }
    
    // Send delay notification
    static async sendDelayNotification(orderId) {
        // Implement notification logic
        console.log(`Order ${orderId} is delayed - sending notification`);
    }
}
```

**Usage on Merchant Dashboard:**
```html
<!-- Merchant Order Card -->
<div class="order-card">
    <h3>Order #123</h3>
    <div class="sla-timer">
        Time Remaining: <span id="timer-123"></span>
    </div>
    <button onclick="markOrderReady('123')">Mark Ready</button>
</div>

<script>
async function loadOrderWithSLA(orderId) {
    const order = await DB.getOrder(orderId);
    
    // Start countdown
    const expectedTime = new Date(order.expected_delivery_time);
    SLATracker.createCountdownTimer(expectedTime, `timer-${orderId}`);
}

async function markOrderReady(orderId) {
    await SLATracker.logOrderEvent(orderId, 'ready', 'Order packed and ready for pickup');
    await DB.updateOrderStatus(orderId, 'ready', {
        preparation_completed_at: new Date().toISOString()
    });
}
</script>
```

---

### Step 2.2: Commission System

**Create `js/commission.js`:**

```javascript
// commission.js - Commission Calculation

class CommissionCalculator {
    
    // Calculate commission for an order
    static async calculateOrderCommission(orderId) {
        const sb = getSupabase();
        if (!sb) return null;
        
        // Get order details
        const { data: order } = await sb
            .from('orders')
            .select('*, store_id')
            .eq('id', orderId)
            .single();
        
        if (!order) return null;
        
        // Get commission settings for store
        const { data: settings } = await sb
            .from('commission_settings')
            .select('*')
            .eq('store_id', order.store_id)
            .eq('is_active', true)
            .single();
        
        if (!settings) {
            // Default commission
            settings = {
                commission_percentage: 15,
                delivery_fee_share_percentage: 100,
                payment_gateway_fee_percentage: 2
            };
        }
        
        // Calculate breakdown
        const subtotal = order.subtotal || 0;
        const deliveryFee = order.delivery_fee || 0;
        
        const commissionAmount = (subtotal * settings.commission_percentage) / 100;
        const deliveryFeeShare = (deliveryFee * settings.delivery_fee_share_percentage) / 100;
        const paymentGatewayFee = (subtotal * settings.payment_gateway_fee_percentage) / 100;
        
        const platformEarnings = commissionAmount + deliveryFee - deliveryFeeShare;
        const merchantEarnings = subtotal - commissionAmount - paymentGatewayFee + deliveryFeeShare;
        
        return {
            subtotal,
            deliveryFee,
            commissionAmount,
            deliveryFeeShare,
            paymentGatewayFee,
            platformEarnings,
            merchantEarnings,
            commissionPercentage: settings.commission_percentage
        };
    }
    
    // Update order with commission details
    static async updateOrderCommission(orderId) {
        const breakdown = await this.calculateOrderCommission(orderId);
        if (!breakdown) return;
        
        const sb = getSupabase();
        await sb
            .from('orders')
            .update({
                commission_amount: breakdown.commissionAmount,
                merchant_earnings: breakdown.merchantEarnings,
                platform_earnings: breakdown.platformEarnings
            })
            .eq('id', orderId);
        
        return breakdown;
    }
    
    // Get merchant earnings summary
    static async getMerchantEarningsSummary(storeId, startDate, endDate) {
        const sb = getSupabase();
        if (!sb) return null;
        
        const { data: orders } = await sb
            .from('orders')
            .select('subtotal, delivery_fee, commission_amount, merchant_earnings, status')
            .eq('store_id', storeId)
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('status', 'delivered');
        
        if (!orders) return null;
        
        const summary = orders.reduce((acc, order) => {
            acc.totalOrders += 1;
            acc.totalOrderValue += order.subtotal || 0;
            acc.totalDeliveryFees += order.delivery_fee || 0;
            acc.totalCommission += order.commission_amount || 0;
            acc.totalEarnings += order.merchant_earnings || 0;
            return acc;
        }, {
            totalOrders: 0,
            totalOrderValue: 0,
            totalDeliveryFees: 0,
            totalCommission: 0,
            totalEarnings: 0
        });
        
        return summary;
    }
}
```

**Display on Merchant Dashboard:**
```javascript
// Show commission breakdown for each order
async function displayOrderDetails(orderId) {
    const breakdown = await CommissionCalculator.calculateOrderCommission(orderId);
    
    const html = `
        <div class="commission-breakdown">
            <h4>Financial Breakdown</h4>
            <div class="breakdown-row">
                <span>Order Value:</span>
                <span>₹${breakdown.subtotal.toFixed(2)}</span>
            </div>
            <div class="breakdown-row">
                <span>Platform Commission (${breakdown.commissionPercentage}%):</span>
                <span class="text-danger">- ₹${breakdown.commissionAmount.toFixed(2)}</span>
            </div>
            <div class="breakdown-row">
                <span>Delivery Fee Share:</span>
                <span class="text-success">+ ₹${breakdown.deliveryFeeShare.toFixed(2)}</span>
            </div>
            <div class="breakdown-row">
                <span>Payment Gateway Fee:</span>
                <span class="text-danger">- ₹${breakdown.paymentGatewayFee.toFixed(2)}</span>
            </div>
            <div class="breakdown-row total">
                <span><strong>Your Earnings:</strong></span>
                <span class="text-success"><strong>₹${breakdown.merchantEarnings.toFixed(2)}</strong></span>
            </div>
        </div>
    `;
    
    document.getElementById('commissionDetails').innerHTML = html;
}
```

---

## 📚 Next Steps

This covers the foundation and core operational features. Would you like me to continue with:

1. **Wave 3: Delivery Operations** (Rider assignment, tracking)
2. **Wave 4: Growth Features** (Promo codes, referrals, reviews)
3. **Edge Functions** (Server-side logic for critical operations)
4. **Mobile-Optimized Views** (Picker view, Rider app)

Let me know which area you'd like me to detail next!

---

## ⚠️ Important Warnings

### Security
- Never expose commission calculations on client-side only
- Use Edge Functions for promo code validation
- Implement rate limiting on stock reservation APIs
- Validate all geolocation data server-side

### Performance
- Index geolocation queries properly
- Cache nearby stores for 5 minutes
- Release expired reservations in batches
- Use database triggers for stock updates where possible

### Data Integrity
- Always use transactions for stock operations
- Log all commission calculations
- Maintain audit trail for payouts
- Verify delivery distances server-side

### UX
- Show real-time stock updates
- Display SLA countdown prominently
- Provide clear commission breakdown
- Enable location permissions gracefully

