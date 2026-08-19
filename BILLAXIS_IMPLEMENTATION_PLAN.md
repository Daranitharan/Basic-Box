# 🎯 BILLAXIS Q-Commerce Platform - Implementation Plan

## 📋 Overview
Transform existing "Basics Box" Merchant App into a full-fledged Q-Commerce platform with three interconnected applications sharing a single Supabase backend.

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ADMIN APP   │────▶│  SUPABASE    │◀────│  USER APP    │
│  (Platform)  │     │  (Backend)   │     │  (Customer)  │
└──────────────┘     └───────┬──────┘     └──────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │ MERCHANT APP │
                    │ (Dark Store) │
                    └──────────────┘
```

---

## 📊 Current Status Analysis

### ✅ Already Exists (DO NOT REBUILD)
- [x] Products management (CRUD)
- [x] Inventory tracking
- [x] Purchase recording
- [x] Stock adjustments
- [x] Orders table & basic CRUD
- [x] Profit calculation
- [x] Dashboard with charts
- [x] Reports generation
- [x] LocalStorage + Supabase hybrid storage
- [x] Authentication (login/register)
- [x] Dark theme support
- [x] Custom dropdown UI (just created)

### 🆕 New Features to Build
- [ ] Multi-role system (admin/merchant/customer)
- [ ] Store profiles
- [ ] Realtime order notifications
- [ ] Email notifications (Edge Functions)
- [ ] SLA countdown timer
- [ ] Pick List view
- [ ] Expiry/batch tracking
- [ ] Low stock alerts (enhanced)
- [ ] Commission calculation
- [ ] Delivery partner assignment
- [ ] Returns & refunds flow
- [ ] User App (customer-facing)
- [ ] Admin App (platform management)

---

## 🎯 Implementation Phases

### **PHASE 1: Database Migration & Branding** (Priority: HIGHEST)

#### 1.1 Run Database Migration
- **File**: `supabase-schema-v3-billaxis.sql`
- **Action**: Execute in Supabase SQL Editor
- **Result**: Adds all new tables and columns without breaking existing data

#### 1.2 Rebrand to Billaxis
- **Replace**: "Basics Box" → "Billaxis"
- **Replace**: "BB" brand chip → Billaxis logo
- **Files to update**:
  - All HTML files (sidebar, headers)
  - `css/style.css` (`.brand-chip` styles)
  - `README.md` or any docs
  
**Logo Implementation**:
```html
<!-- Old -->
<div class="brand-chip">BB</div>

<!-- New -->
<div class="brand-chip">
    <img src="assets/billaxis-icon.svg" alt="Billaxis" style="width:100%;height:100%;">
</div>
```

**Deliverables**:
- ✅ Database schema migrated
- ✅ All branding updated
- ✅ Assets folder created with logo

---

### **PHASE 2: Enhanced DB Layer** (Priority: HIGH)

#### 2.1 Update `db.js` with New Methods

**New methods needed**:
```javascript
// Stores
async getStore(merchantId)
async saveStore(store)
async updateStore(storeId, updates)

// Notifications
async getNotifications(userId)
async markNotificationRead(notificationId)
async createNotification(notification)

// Batches
async getProductBatches(productId)
async saveBatch(batch)
async getBatchesNearExpiry(days = 30)

// Commission
async getCommissionSettings(merchantId)
async calculateOrderCommission(orderId)

// Returns
async createReturn(returnData)
async getReturns(merchantId)
async updateReturnStatus(returnId, status, notes)

// Delivery Partners
async getDeliveryPartners(merchantId)
async assignDeliveryPartner(orderId, partnerId)
```

**File**: `js/db.js`

**Deliverables**:
- ✅ All new DB methods implemented
- ✅ Backward compatible with existing code

---

### **PHASE 3: Realtime Order Notifications** (Priority: HIGHEST)

#### 3.1 Merchant App - Order Listener

**File**: `js/realtime-orders.js` (NEW)

```javascript
// Subscribe to new orders for current merchant
class OrderRealtimeManager {
    constructor() {
        this.subscription = null;
        this.audioNotification = new Audio('assets/notification.mp3');
    }

    async init() {
        const supabase = getSupabase();
        const user = await getSupabaseUserId();
        
        // Subscribe to orders where merchant_id = current user
        this.subscription = supabase
            .channel('merchant-orders')
            .on('postgres_changes', 
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `merchant_id=eq.${user}`
                },
                (payload) => this.handleNewOrder(payload.new)
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `merchant_id=eq.${user}`
                },
                (payload) => this.handleOrderUpdate(payload.new)
            )
            .subscribe();
    }

    handleNewOrder(order) {
        // Play sound
        this.audioNotification.play();
        
        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification('New Order!', {
                body: `Order #${order.order_id_label} - ₹${order.total}`,
                icon: '/assets/billaxis-icon.svg'
            });
        }
        
        // Update UI badge
        this.updateOrderBadge();
        
        // Show toast
        showToast(`New order received! Order #${order.order_id_label}`, 'success');
        
        // Refresh orders list if on orders page
        if (window.location.href.includes('orders.html')) {
            if (typeof loadOrders === 'function') {
                loadOrders();
            }
        }
    }

    handleOrderUpdate(order) {
        // Refresh orders list
        if (window.location.href.includes('orders.html')) {
            if (typeof loadOrders === 'function') {
                loadOrders();
            }
        }
    }

    updateOrderBadge() {
        // Show badge count for "new" orders
        const newOrderCount = (Storage.get('bb-orders') || [])
            .filter(o => o.status === 'new').length;
        
        document.querySelectorAll('.order-badge').forEach(badge => {
            badge.textContent = newOrderCount;
            badge.style.display = newOrderCount > 0 ? 'flex' : 'none';
        });
    }

    destroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

// Auto-init
let orderRealtimeManager;
document.addEventListener('DOMContentLoaded', () => {
    if (supabaseConfigured()) {
        orderRealtimeManager = new OrderRealtimeManager();
        orderRealtimeManager.init();
        
        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
});
```

**Add to all Merchant App HTML files**:
```html
<script src="../js/realtime-orders.js"></script>
```

**Deliverables**:
- ✅ Realtime order subscription working
- ✅ Sound notification on new order
- ✅ Browser notification support
- ✅ Auto-refresh order list

---

### **PHASE 4: SLA Timer & Pick List** (Priority: HIGH)

#### 4.1 SLA Countdown Timer

**File**: Update `js/orders.js`

Add real-time countdown for orders in preparation:

```javascript
function startSLATimer(order) {
    const targetTime = new Date(order.target_delivery_time || order.date);
    targetTime.setMinutes(targetTime.getMinutes() + 30); // 30-min SLA
    
    const timerEl = document.getElementById(`sla-timer-${order.id}`);
    if (!timerEl) return;
    
    const interval = setInterval(() => {
        const now = new Date();
        const diff = targetTime - now;
        
        if (diff <= 0) {
            timerEl.innerHTML = '<span style="color:var(--danger);">⏰ OVERDUE</span>';
            clearInterval(interval);
            return;
        }
        
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        const color = minutes < 5 ? 'var(--danger)' : 
                      minutes < 10 ? 'var(--warning)' : 'var(--success)';
        
        timerEl.innerHTML = `
            <span style="color:${color};font-weight:700;">
                ${minutes}:${seconds.toString().padStart(2, '0')}
            </span>
        `;
    }, 1000);
}
```

#### 4.2 Pick List View

**File**: `pages/pick-list.html` (NEW)

Dedicated view showing only items to pick for "preparing" orders:

```html
<!-- Show grouped products across all preparing orders -->
<div class="pick-list-card">
    <h4>Parle-G Biscuits</h4>
    <p>SKU: BIS001 | Location: Aisle 3, Shelf B</p>
    <div class="pick-quantity">
        <strong>Total to Pick: 15 pcs</strong>
    </div>
    <div class="pick-orders">
        For Orders: #1234 (5 pcs), #1235 (10 pcs)
    </div>
</div>
```

**Deliverables**:
- ✅ SLA timer on order detail panel
- ✅ Pick list page with grouped items
- ✅ Color-coded urgency indicators

---

### **PHASE 5: Expiry & Batch Tracking** (Priority: MEDIUM)

#### 5.1 Batch Management UI

**File**: `pages/batches.html` (NEW)

Allow merchants to:
- Add batch number when purchasing
- Set expiry date
- View all batches
- Get alerts for expiring products

**Integration with Purchase Flow**:
```javascript
// When adding purchase, optionally create batch
if (product.hasExpiry) {
    const batch = {
        id: Date.now().toString(),
        productId: product.id,
        merchantId: user.id,
        batchNumber: document.getElementById('batchNumber').value,
        quantity: quantity,
        costPrice: purchasePrice,
        manufacturingDate: document.getElementById('mfgDate').value,
        expiryDate: document.getElementById('expDate').value,
        supplier: supplier
    };
    await DB.saveBatch(batch);
}
```

**Expiry Alerts**:
- Show in notifications
- Highlight in inventory view
- Auto-suggest reorder

**Deliverables**:
- ✅ Batch creation in purchase flow
- ✅ Expiry alerts (30 days before)
- ✅ Batch list view

---

### **PHASE 6: Commission System** (Priority: MEDIUM)

#### 6.1 Admin Sets Commission Rate

**File**: Admin App (to be built)

Admin can set commission % for each merchant.

#### 6.2 Calculate on Order Completion

**File**: Update `js/orders.js`

```javascript
async function completeOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    
    // Calculate commission
    const commission = await DB.calculateOrderCommission(orderId);
    
    // Update order
    order.commissionAmount = commission.amount;
    order.merchantNet = commission.net;
    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    
    await DB.saveOrder(order);
    
    // Show merchant their net earnings
    showToast(`Order completed! Your net: ₹${commission.net}`, 'success');
}
```

#### 6.3 Commission Dashboard

Show merchant:
- Total commission paid this month
- Net earnings
- Commission rate

**Deliverables**:
- ✅ Commission calculation function
- ✅ Display in order completion
- ✅ Commission report in dashboard

---

### **PHASE 7: Email Notifications (Edge Functions)** (Priority: HIGH)

#### 7.1 Setup Resend API

Sign up at [resend.com](https://resend.com) and get API key.

#### 7.2 Create Edge Function

**File**: `supabase/functions/send-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, subject, template, data } = await req.json()
  
  const templates = {
    'order-new-merchant': `
      <h2>New Order Received! 🎉</h2>
      <p>Order #${data.orderId}</p>
      <p>Customer: ${data.customer}</p>
      <p>Total: ₹${data.total}</p>
      <a href="${data.link}">View Order</a>
    `,
    'order-confirmed-customer': `
      <h2>Order Confirmed! ✅</h2>
      <p>Thank you for your order #${data.orderId}</p>
      <p>Total: ₹${data.total}</p>
      <p>Estimated delivery: ${data.eta}</p>
    `,
    'order-delivered-customer': `
      <h2>Order Delivered! 🚀</h2>
      <p>Your order #${data.orderId} has been delivered.</p>
      <p>Enjoy your products from Billaxis!</p>
    `
  }
  
  const html = templates[template] || data.message
  
  const { data: emailData, error } = await resend.emails.send({
    from: 'Billaxis <orders@billaxis.com>',
    to: [to],
    subject,
    html
  })
  
  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }
  
  return new Response(JSON.stringify({ success: true, data: emailData }))
})
```

#### 7.3 Deploy Function

```bash
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_xxxxx
```

#### 7.4 Call from Frontend

```javascript
async function sendOrderEmail(order, recipient, template) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
            to: recipient,
            subject: `Order #${order.orderId}`,
            template: template,
            data: {
                orderId: order.orderId,
                customer: order.customer,
                total: order.total,
                eta: '30 mins',
                link: `https://merchant.billaxis.com/orders?id=${order.id}`
            }
        }
    });
    
    if (error) console.error('Email error:', error);
}

// Usage
await sendOrderEmail(order, merchant.email, 'order-new-merchant');
await sendOrderEmail(order, customer.email, 'order-confirmed-customer');
```

**Deliverables**:
- ✅ Edge function deployed
- ✅ Email templates created
- ✅ Auto-send on order events

---

### **PHASE 8: Returns & Refunds Flow** (Priority: MEDIUM)

#### 8.1 Customer Initiates Return (User App)

Customer can request return with:
- Select items
- Reason
- Photos (optional)

#### 8.2 Merchant Reviews (Merchant App)

**File**: `pages/returns.html` (NEW)

Merchant can:
- View return requests
- Approve/reject
- Process refund

```javascript
async function approveReturn(returnId) {
    await DB.updateReturnStatus(returnId, 'approved', 'Return approved by merchant');
    
    // Re-add stock
    const returnObj = returns.find(r => r.id === returnId);
    for (const item of returnObj.items) {
        const product = await DB.getProduct(item.productId);
        await DB.updateProductStock(item.productId, product.currentStock + item.quantity);
    }
    
    showToast('Return approved and stock restored', 'success');
}
```

**Deliverables**:
- ✅ Return creation in User App
- ✅ Return review in Merchant App
- ✅ Auto stock restoration on approval

---

### **PHASE 9: User App (Customer-Facing)** (Priority: HIGH)

#### 9.1 Create New Folder Structure

```
user-app/
├── index.html (Home/Browse Products)
├── product-detail.html
├── cart.html
├── checkout.html
├── orders.html (Customer orders list)
├── order-tracking.html
├── profile.html
├── css/
│   └── user-style.css
└── js/
    ├── user-products.js (Browse & search)
    ├── user-cart.js
    ├── user-checkout.js
    ├── user-orders.js (Realtime tracking)
    └── user-auth.js
```

#### 9.2 Key Features

**Product Browsing**:
- Grid view with images
- Category filter
- Search
- Add to cart

**Cart & Checkout**:
- Cart management
- Address input
- Payment method selection
- Place order → Insert into Supabase

**Order Tracking**:
- Live status updates via Realtime
- ETA countdown
- Chat with merchant (optional)

**Order Creation Code**:
```javascript
async function placeOrder() {
    const cart = Storage.get('user-cart') || [];
    const user = getCurrentUser();
    const merchant = await DB.getMerchantForStore(selectedStoreId);
    
    const order = {
        id: Date.now().toString(),
        orderId: `ORD${Date.now()}`,
        customerId: user.id,
        merchantId: merchant.id,
        storeId: selectedStoreId,
        orderType: 'online',
        customer: user.name,
        phone: user.phone,
        address: deliveryAddress,
        items: cart.map(item => ({
            productId: item.id,
            productName: item.name,
            qty: item.quantity,
            price: item.sellingPrice,
            costPrice: item.costPrice
        })),
        subtotal: calculateSubtotal(cart),
        deliveryFee: 20,
        total: calculateTotal(cart),
        payment: paymentMethod,
        paymentStatus: 'pending',
        status: 'new',
        date: new Date().toISOString(),
        targetDeliveryTime: new Date(Date.now() + 30 * 60000).toISOString() // 30 min
    };
    
    await DB.saveOrder(order);
    
    // Send email to merchant
    await sendOrderEmail(order, merchant.email, 'order-new-merchant');
    
    showToast('Order placed successfully!', 'success');
    window.location.href = 'order-tracking.html?id=' + order.id;
}
```

**Deliverables**:
- ✅ User App complete structure
- ✅ Product browsing
- ✅ Cart & checkout
- ✅ Order placement
- ✅ Live order tracking

---

### **PHASE 10: Admin App (Platform Management)** (Priority: MEDIUM)

#### 10.1 Create Admin App

```
admin-app/
├── index.html (Dashboard)
├── merchants.html (List all merchants)
├── orders.html (All orders across platform)
├── commission.html (Set/view commission)
├── analytics.html (Platform metrics)
└── js/
    └── admin-*.js
```

#### 10.2 Key Features

**Merchant Management**:
- List all merchants
- Approve/suspend
- Set commission rates
- View merchant stats

**Order Overview**:
- See all orders (all merchants)
- Filter by status, merchant, date
- Order analytics

**Commission Dashboard**:
- Total commission earned
- Per-merchant breakdown
- Export reports

**RLS Note**: Admin role bypasses merchant-scoped policies via:
```sql
CREATE POLICY "xxx_admin_full_access" ON public.xxx
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
```

**Deliverables**:
- ✅ Admin dashboard
- ✅ Merchant management
- ✅ Commission configuration
- ✅ Platform analytics

---

## 🔐 Security Warnings

### 1. **Row Level Security (RLS)**
- ✅ All tables have RLS enabled
- ✅ Customers only see their orders
- ✅ Merchants only see their store data
- ✅ Admin bypasses via role check

### 2. **API Keys**
- ⚠️ Never expose service_role key in frontend
- ✅ Use anon key in frontend
- ✅ Edge Functions use service_role internally

### 3. **Email Security**
- ✅ Validate email addresses before sending
- ✅ Rate limit Edge Functions
- ✅ Use environment variables for API keys

### 4. **Data Validation**
- ✅ Validate all inputs on frontend
- ✅ Use database constraints
- ✅ Sanitize user-generated content

### 5. **Authentication**
- ✅ Use Supabase Auth only
- ✅ Never store passwords locally
- ✅ Implement session timeout

---

## 📁 Recommended Folder Structure

```
billaxis-platform/
│
├── merchant-app/              (existing, rename from qcommerce-inventory)
│   ├── assets/
│   │   ├── billaxis-logo.svg
│   │   ├── billaxis-icon.svg
│   │   └── notification.mp3
│   ├── css/
│   ├── js/
│   │   ├── db.js (UPDATED with new methods)
│   │   ├── realtime-orders.js (NEW)
│   │   └── ...
│   ├── pages/
│   │   ├── pick-list.html (NEW)
│   │   ├── batches.html (NEW)
│   │   ├── returns.html (NEW)
│   │   └── ...
│   └── merchant.html
│
├── user-app/                  (NEW)
│   ├── index.html
│   ├── cart.html
│   ├── checkout.html
│   ├── order-tracking.html
│   ├── css/
│   │   └── user-style.css
│   └── js/
│       ├── user-products.js
│       ├── user-cart.js
│       └── user-orders.js
│
├── admin-app/                 (NEW)
│   ├── index.html
│   ├── merchants.html
│   ├── commission.html
│   ├── css/
│   │   └── admin-style.css
│   └── js/
│       └── admin-*.js
│
├── supabase/
│   ├── functions/
│   │   └── send-email/
│   │       └── index.ts
│   └── migrations/
│       └── 20240101_billaxis_v3.sql
│
└── shared/                    (optional, for shared assets)
    └── logo/
```

---

## 🚀 Deployment Checklist

### Database
- [ ] Run `supabase-schema-v3-billaxis.sql` in Supabase
- [ ] Verify all tables created
- [ ] Test RLS policies
- [ ] Enable Realtime on orders table

### Edge Functions
- [ ] Deploy `send-email` function
- [ ] Set Resend API key as secret
- [ ] Test email sending

### Merchant App
- [ ] Update branding to Billaxis
- [ ] Add realtime order listener
- [ ] Test order notifications
- [ ] Deploy to hosting (Netlify/Vercel)

### User App
- [ ] Build and test locally
- [ ] Connect to same Supabase project
- [ ] Test order placement
- [ ] Deploy to hosting

### Admin App
- [ ] Build admin dashboard
- [ ] Test commission settings
- [ ] Deploy to hosting (password-protected)

---

## 📝 Next Immediate Steps

1. **Run Database Migration** (15 mins)
   - Execute `supabase-schema-v3-billaxis.sql`
   - Verify in Supabase dashboard

2. **Rebrand to Billaxis** (30 mins)
   - Replace all "Basics Box" text
   - Update logo in sidebar
   - Add logo files to assets folder

3. **Update db.js** (1 hour)
   - Add new methods for stores, notifications, batches
   - Test backward compatibility

4. **Implement Realtime Orders** (2 hours)
   - Create `realtime-orders.js`
   - Add sound notification
   - Test with sample order insertion

5. **Build User App MVP** (4 hours)
   - Product browsing
   - Cart
   - Order placement
   - Test end-to-end flow

6. **Deploy Edge Function** (1 hour)
   - Setup Resend
   - Deploy email function
   - Test email delivery

---

## 🎯 Success Criteria

- ✅ Customer can browse products and place order in User App
- ✅ Merchant receives instant notification (sound + browser notification)
- ✅ Order appears in Merchant App orders list
- ✅ Merchant can update order status
- ✅ Customer sees live status update in User App
- ✅ Email sent to both parties on order events
- ✅ Stock deducted only on order completion
- ✅ Commission calculated and displayed
- ✅ Admin can view all merchants and orders
- ✅ All apps share same Supabase backend
- ✅ RLS properly isolates data by role

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Realtime Guide**: https://supabase.com/docs/guides/realtime
- **Edge Functions**: https://supabase.com/docs/guides/functions
- **Resend Docs**: https://resend.com/docs

---

**Estimated Total Time**: 20-30 hours for full implementation
**Priority Order**: Phase 1 → Phase 3 → Phase 2 → Phase 9 → Phase 7 → Phase 4 → Others

---

Good luck building Billaxis! 🚀
