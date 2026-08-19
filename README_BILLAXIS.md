# 🎯 BILLAXIS Q-Commerce Platform

> Transform your Q-Commerce business with real-time order management, multi-role support, and seamless integration.

## 📋 What's Been Implemented

### ✅ Core Features (Ready to Use)
- **Multi-Role Database Schema** - Admin, Merchant, Customer roles with proper RLS
- **Realtime Order Notifications** - Instant sound + browser notifications when orders arrive
- **Custom UI Components** - Beautiful themed dropdowns matching dark mode
- **Enhanced Orders System** - Full order lifecycle with SLA tracking
- **Billaxis Branding** - New logo and professional design (partial)
- **Products Management** - CRUD with categories, SKU, stock tracking
- **Inventory System** - Stock movements, adjustments, low-stock alerts
- **Dashboard Analytics** - Sales charts, profit tracking, recent transactions
- **Reports** - Transaction history with profit calculations

### 🚧 In Progress
- Branding update (60% complete - needs bulk replacement)
- User App (customer-facing)
- Admin App (platform management)
- Email notifications via Edge Functions
- Batch/expiry tracking

---

## 🚀 Quick Start

### Prerequisites
- Supabase account ([signup here](https://supabase.com))
- Basic understanding of JavaScript
- Web browser with notification support

### Step 1: Database Setup (10 minutes)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create new project
   - Wait for project to be ready (~2 minutes)

2. **Update Config**
   ```javascript
   // Edit: qcommerce-inventory/js/config.js
   
   const SUPABASE_URL = 'YOUR_PROJECT_URL';  // From Supabase Settings → API
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // From Supabase Settings → API
   ```

3. **Run Database Migration**
   - Open Supabase dashboard → SQL Editor
   - Copy contents of `supabase-schema-v3-billaxis.sql`
   - Paste and click "Run"
   - Verify tables created in Table Editor

### Step 2: Test Realtime Notifications (5 minutes)

1. **Open Merchant App**
   ```
   Open: qcommerce-inventory/merchant.html in browser
   ```

2. **Allow Notifications**
   - Browser will prompt for notification permission
   - Click "Allow"

3. **Insert Test Order**
   - Go to Supabase → SQL Editor
   - Run this (replace YOUR_USER_ID with your actual user ID from auth.users):
   ```sql
   INSERT INTO orders (
     id, merchant_id, user_id, order_id_label, 
     customer, phone, total, status, date
   )
   VALUES (
     gen_random_uuid()::text,
     'YOUR_USER_ID',  -- Get from: SELECT id FROM auth.users;
     'YOUR_USER_ID',
     'TEST001',
     'Test Customer',
     '9876543210',
     250.00,
     'new',
     NOW()
   );
   ```

4. **Verify**
   - ✅ Sound notification plays
   - ✅ Browser notification appears
   - ✅ Toast message shows
   - ✅ Order appears in Orders page
   - ✅ Badge count updates

---

## 📁 Project Structure

```
billaxis-platform/
│
├── qcommerce-inventory/          # MERCHANT APP (existing, updated)
│   ├── assets/
│   │   ├── billaxis-logo.svg     ✅ Created
│   │   ├── billaxis-icon.svg     ✅ Created
│   │   └── notification.mp3      ⏳ TODO: Add sound file
│   │
│   ├── css/
│   │   ├── style.css             ✅ Updated with custom dropdowns
│   │   └── ...
│   │
│   ├── js/
│   │   ├── realtime-orders.js    ✅ NEW - Order notifications
│   │   ├── custom-dropdown.js    ✅ NEW - Custom UI components
│   │   ├── db.js                 ⏳ TODO: Add new methods
│   │   ├── orders.js             ✅ Existing
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── orders.html           ✅ Updated branding
│   │   ├── products.html         ⏳ TODO: Update branding
│   │   └── ...
│   │
│   └── merchant.html             ✅ Updated branding
│
├── user-app/                     ⏳ TODO: Create
│   └── (Customer-facing app)
│
├── admin-app/                    ⏳ TODO: Create
│   └── (Platform management)
│
├── supabase/
│   └── functions/
│       └── send-email/           ⏳ TODO: Email notifications
│
├── supabase-schema-v3-billaxis.sql    ✅ Complete schema
├── BILLAXIS_IMPLEMENTATION_PLAN.md    ✅ Detailed guide
├── BILLAXIS_PROGRESS_REPORT.md        ✅ Progress tracking
└── README_BILLAXIS.md                 ✅ This file
```

---

## 🔨 Immediate TODOs

### 1. Complete Branding (30 minutes)

**Manual Steps:**
Open each HTML file and replace:

**Find**: `Basics Box`  
**Replace**: `Billaxis`

**Find**: 
```html
<div class="brand-chip">BB</div>
```
**Replace**: 
```html
<div class="brand-chip">
    <img src="../assets/billaxis-icon.svg" alt="Billaxis" style="width:100%;height:100%;object-fit:contain;">
</div>
```

**Files to update:**
- ✅ merchant.html (done)
- ✅ pages/orders.html (done)
- ⏳ pages/products.html
- ⏳ pages/inventory.html
- ⏳ pages/customers.html
- ⏳ pages/reports.html
- ⏳ pages/notifications.html
- ⏳ pages/settings.html
- ⏳ pages/buy.html
- ⏳ pages/stock.html
- ⏳ login.html
- ⏳ register.html

### 2. Add Notification Sound (5 minutes)

**Option A - Quick & Easy:**
1. Go to [freesound.org](https://freesound.org)
2. Search "notification ding"
3. Download a short (< 1 second) MP3
4. Save as: `qcommerce-inventory/assets/notification.mp3`

**Option B - Record yourself:**
1. Record a simple "ding" or "bell" sound
2. Convert to MP3
3. Save as: `qcommerce-inventory/assets/notification.mp3`

### 3. Add Realtime Script to Remaining Pages (15 minutes)

Add this line after `auth.js` in these files:
```html
<script src="../js/realtime-orders.js"></script>
```

**Files:**
- ⏳ pages/products.html
- ⏳ pages/inventory.html  
- ⏳ pages/customers.html
- ⏳ pages/reports.html
- ⏳ pages/notifications.html
- ⏳ pages/settings.html
- ⏳ pages/buy.html
- ⏳ pages/stock.html

---

## 🎯 Next Steps (Build User App)

### User App MVP (4-6 hours)

**Goal**: Customer can browse products and place orders that merchants receive in real-time.

**Create these files:**

```
user-app/
├── index.html           # Browse products
├── cart.html            # Shopping cart
├── checkout.html        # Place order
├── order-tracking.html  # Track order status
└── js/
    ├── user-products.js # Product browsing
    ├── user-cart.js     # Cart management
    └── user-checkout.js # Order placement
```

**Key Code Snippet** (Order Placement):
```javascript
// user-checkout.js
async function placeOrder() {
    const cart = Storage.get('user-cart') || [];
    const user = getCurrentUser();
    
    // Get merchant from selected store
    const merchantId = 'MERCHANT_UUID_HERE'; // From store selection
    
    const order = {
        id: Date.now().toString(),
        orderId: `ORD${Date.now()}`,
        customerId: user.id,
        merchantId: merchantId,
        userId: user.id, // For backward compatibility
        orderType: 'online',
        customer: user.name,
        phone: user.phone,
        address: document.getElementById('deliveryAddress').value,
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
        date: new Date().toISOString()
    };
    
    // This will trigger realtime notification to merchant!
    await DB.saveOrder(order);
    
    showToast('Order placed successfully!', 'success');
    window.location.href = 'order-tracking.html?id=' + order.id;
}
```

---

## 📊 Database Schema Highlights

### Key Tables Added

**stores** - Store/merchant profiles
- Location data (lat/lng)
- Business hours
- Delivery settings
- Commission rates

**product_batches** - Expiry tracking
- Batch numbers
- Manufacturing/expiry dates
- FIFO/FEFO support

**notifications** - In-app notifications
- Order events
- Low stock alerts
- Expiry warnings

**returns** - Return/refund management
- Customer requests
- Merchant approvals
- Stock restoration

**delivery_partners** - Delivery management
- Partner assignment
- Location tracking
- Rating system

**commission_settings** - Platform revenue
- Per-merchant rates
- Effective dates
- Auto-calculation

---

## 🔐 Security

### RLS (Row Level Security)

All tables have proper RLS policies:

✅ **Merchants** - Can only see their own store data  
✅ **Customers** - Can only see their own orders  
✅ **Admin** - Bypass restrictions, see all data  
✅ **Delivery Partners** - See only assigned orders

### API Keys

⚠️ **NEVER** expose service_role key in frontend  
✅ Use anon key in all client-side code  
✅ Service role only in Edge Functions

---

## 🛠️ Troubleshooting

### Realtime Not Working?

**Check 1**: Is Realtime enabled?
```sql
-- In Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

**Check 2**: Correct merchant_id in test order?
```sql
SELECT id FROM auth.users; -- Get your user ID
```

**Check 3**: Browser notifications allowed?
- Check browser settings → Site settings → Notifications

**Check 4**: Console errors?
- Open browser DevTools → Console tab
- Look for Supabase connection errors

### Orders Not Appearing?

**Check 1**: RLS policies correct?
```sql
-- Should see your order:
SELECT * FROM orders WHERE merchant_id = auth.uid();
```

**Check 2**: LocalStorage + Supabase sync?
- Clear browser cache
- Refresh page
- Check DevTools → Application → Local Storage

---

## 📞 Support & Resources

### Official Docs
- [Supabase Docs](https://supabase.com/docs)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

### Implementation Guides
- `BILLAXIS_IMPLEMENTATION_PLAN.md` - Full 10-phase plan
- `BILLAXIS_PROGRESS_REPORT.md` - Current status
- `supabase-schema-v3-billaxis.sql` - Complete schema

---

## 🎯 Success Checklist

### Phase 1 Complete When:
- [ ] Database migration successful
- [ ] All branding updated to Billaxis
- [ ] Realtime notifications working
- [ ] Can insert test order and see notification
- [ ] Sound + browser notifications active

### Phase 2 Complete When:
- [ ] User App MVP built
- [ ] Customer can browse products
- [ ] Customer can add to cart
- [ ] Customer can place order
- [ ] Merchant receives order in real-time
- [ ] End-to-end flow tested

### Phase 3 Complete When:
- [ ] Admin App MVP built
- [ ] Admin can view all merchants
- [ ] Admin can set commission rates
- [ ] Admin dashboard shows platform metrics
- [ ] Email notifications working

---

## 🚀 Production Deployment

### Checklist Before Going Live

1. **Database**
   - [ ] Run final migration
   - [ ] Verify all RLS policies
   - [ ] Test with real user accounts
   - [ ] Backup strategy in place

2. **Apps**
   - [ ] All branding complete
   - [ ] Error handling robust
   - [ ] Loading states implemented
   - [ ] Mobile responsive

3. **Security**
   - [ ] No service_role key in frontend
   - [ ] HTTPS enabled
   - [ ] CORS configured
   - [ ] Rate limiting on Edge Functions

4. **Performance**
   - [ ] Images optimized
   - [ ] Lazy loading implemented
   - [ ] CDN for static assets
   - [ ] Database indexes added

5. **Monitoring**
   - [ ] Supabase logging enabled
   - [ ] Error tracking (Sentry?)
   - [ ] Analytics (GA4?)
   - [ ] Uptime monitoring

---

## 📄 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Backend & Realtime
- [Chart.js](https://www.chartjs.org) - Analytics charts
- [Font Awesome](https://fontawesome.com) - Icons

---

**Last Updated**: 2026-08-19  
**Version**: 1.0.0 (MVP In Progress)  
**Status**: 🚧 Under Active Development

---

For detailed implementation guidance, see `BILLAXIS_IMPLEMENTATION_PLAN.md`
