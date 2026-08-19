# 🗄️ BILLAXIS Database Overview

## Database Architecture

Your BILLAXIS platform uses a **hybrid database system**:

### 1. **Primary: Supabase (PostgreSQL)** 🐘
- **Type**: Cloud-hosted PostgreSQL database
- **Provider**: Supabase (Open-source Firebase alternative)
- **Schema File**: `qcommerce-inventory/supabase-schema-v3-billaxis.sql`

### 2. **Fallback: LocalStorage** 💾
- **Type**: Browser-based key-value storage
- **Location**: User's browser (5-10MB limit)
- **Purpose**: Offline functionality & quick access

---

## 🐘 Supabase PostgreSQL Database

### What is Supabase?

**Supabase** = PostgreSQL + Authentication + Realtime + Storage + Edge Functions

**Official Site**: https://supabase.com  
**Pricing**: Free tier available (500MB database, 50,000 monthly active users)

### Why PostgreSQL?
- **Enterprise-grade**: Used by Instagram, Reddit, Uber
- **ACID compliant**: Reliable transactions
- **Powerful**: Advanced queries, JSON support, full-text search
- **Scalable**: Handles millions of records
- **Open-source**: No vendor lock-in

---

## 📊 Database Tables (13 Tables)

### Core Tables (Existing)

#### 1. **users** - User Accounts
```sql
- id (UUID, Primary Key)
- name (TEXT)
- email (TEXT, Unique)
- password (TEXT, Hashed)
- role (TEXT: 'admin' | 'merchant' | 'customer')
- merchant_id (UUID, for customers/employees)
- phone (TEXT)
- avatar (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
```
**Purpose**: Store all user accounts (admin, merchants, customers)

#### 2. **products** - Product Catalog
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- merchant_id (UUID → users.id)
- store_id (UUID → stores.id)
- sku (TEXT, Unique)
- name (TEXT)
- category (TEXT)
- unit (TEXT)
- supplier (TEXT)
- barcode (TEXT)
- image_url (TEXT)
- min_stock (INTEGER)
- current_stock (INTEGER)
- cost_price (DECIMAL)
- selling_price (DECIMAL)
- expiry_date (DATE)
- has_expiry (BOOLEAN)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
```
**Purpose**: Store product information and inventory levels

#### 3. **orders** - Customer Orders
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- merchant_id (UUID → users.id)
- customer_id (UUID → users.id)
- store_id (UUID → stores.id)
- order_id_label (TEXT, e.g., "ORD001")
- order_type (TEXT: 'online' | 'offline')
- customer (TEXT, Name)
- phone (TEXT)
- address (TEXT)
- items (JSONB, Array of order items)
- subtotal (DECIMAL)
- total_cost (DECIMAL)
- profit (DECIMAL)
- delivery_fee (DECIMAL)
- total (DECIMAL)
- payment (TEXT: 'cash' | 'card' | 'upi')
- payment_status (TEXT: 'pending' | 'paid' | 'failed')
- status (TEXT: 'new' | 'preparing' | 'ready' | 'delivery' | 'completed' | 'cancelled')
- timeline (JSONB, Status history)
- notes (TEXT)
- date (TIMESTAMPTZ)
- target_delivery_time (TIMESTAMPTZ)
- picked_at (TIMESTAMPTZ)
- packed_at (TIMESTAMPTZ)
- dispatched_at (TIMESTAMPTZ)
- completed_at (TIMESTAMPTZ)
- cancelled_at (TIMESTAMPTZ)
```
**Purpose**: Store customer orders with full lifecycle tracking

#### 4. **purchases** - Stock Purchases
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- merchant_id (UUID → users.id)
- store_id (UUID → stores.id)
- product_id (TEXT → products.id)
- product_name (TEXT)
- quantity (INTEGER)
- cost_price (DECIMAL)
- total_cost (DECIMAL)
- supplier (TEXT)
- date (TIMESTAMPTZ)
```
**Purpose**: Track inventory purchases from suppliers

#### 5. **sales** - Direct Sales (POS)
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- merchant_id (UUID → users.id)
- store_id (UUID → stores.id)
- product_id (TEXT → products.id)
- product_name (TEXT)
- quantity (INTEGER)
- cost_price (DECIMAL)
- selling_price (DECIMAL)
- profit (DECIMAL)
- customer_name (TEXT)
- payment_method (TEXT)
- date (TIMESTAMPTZ)
```
**Purpose**: Record direct sales/POS transactions

#### 6. **customers** - Customer Database
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- merchant_id (UUID → users.id)
- store_id (UUID → stores.id)
- name (TEXT)
- phone (TEXT, Unique)
- email (TEXT)
- address (TEXT)
- total_orders (INTEGER)
- total_spent (DECIMAL)
- last_order_date (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```
**Purpose**: Maintain customer relationship data

---

### New Tables (BILLAXIS Enhancement)

#### 7. **stores** - Merchant Store Profiles
```sql
- id (UUID, Primary Key)
- merchant_id (UUID → users.id)
- store_name (TEXT)
- store_type (TEXT: 'dark_store' | 'retail')
- phone, email, address, city, state, pincode
- latitude, longitude (for location-based features)
- gst_number, fssai_number
- opening_time, closing_time, working_days
- delivery_radius_km (DECIMAL)
- min_order_amount, delivery_fee (DECIMAL)
- commission_rate (DECIMAL)
- is_active, is_verified, onboarding_completed (BOOLEAN)
- logo_url, banner_url, description
- created_at, updated_at
```
**Purpose**: Store merchant/store information for multi-merchant platform

#### 8. **product_batches** - Batch & Expiry Tracking
```sql
- id (TEXT, Primary Key)
- product_id (TEXT → products.id)
- batch_number (TEXT)
- quantity (INTEGER)
- cost_price (DECIMAL)
- mfg_date (DATE)
- expiry_date (DATE)
- supplier (TEXT)
- received_date (TIMESTAMPTZ)
- remaining_quantity (INTEGER)
```
**Purpose**: Track product batches with manufacturing/expiry dates

#### 9. **delivery_partners** - Delivery Personnel
```sql
- id (UUID → users.id, Primary Key)
- merchant_id (UUID → users.id)
- partner_name (TEXT)
- phone (TEXT)
- vehicle_type (TEXT)
- vehicle_number (TEXT)
- license_number (TEXT)
- is_available (BOOLEAN)
- current_latitude, current_longitude (DECIMAL)
- total_deliveries (INTEGER)
- rating (DECIMAL)
- joined_at, last_active_at (TIMESTAMPTZ)
```
**Purpose**: Manage delivery partners and their availability

#### 10. **notifications** - In-App Notifications
```sql
- id (TEXT, Primary Key)
- user_id (UUID → users.id)
- type (TEXT: 'order_new' | 'order_update' | 'low_stock' | 'system')
- title (TEXT)
- message (TEXT)
- data (JSONB, Additional context)
- is_read (BOOLEAN)
- created_at (TIMESTAMPTZ)
```
**Purpose**: Store notification history for users

#### 11. **commission_settings** - Platform Commission
```sql
- id (UUID, Primary Key)
- merchant_id (UUID → users.id)
- rate_percentage (DECIMAL)
- effective_from (DATE)
- effective_until (DATE)
- is_active (BOOLEAN)
- notes (TEXT)
- created_by (UUID → users.id, admin)
- created_at (TIMESTAMPTZ)
```
**Purpose**: Configure commission rates per merchant

#### 12. **commission_ledger** - Commission Tracking
```sql
- id (TEXT, Primary Key)
- order_id (TEXT → orders.id)
- merchant_id (UUID → users.id)
- order_total (DECIMAL)
- commission_rate (DECIMAL)
- commission_amount (DECIMAL)
- merchant_earnings (DECIMAL)
- status (TEXT: 'pending' | 'paid')
- calculated_at (TIMESTAMPTZ)
- paid_at (TIMESTAMPTZ)
```
**Purpose**: Track commission calculations and payouts

#### 13. **returns** - Returns & Refunds
```sql
- id (TEXT, Primary Key)
- order_id (TEXT → orders.id)
- customer_id (UUID → users.id)
- merchant_id (UUID → users.id)
- items (JSONB, Returned items)
- reason (TEXT)
- status (TEXT: 'requested' | 'approved' | 'rejected' | 'completed')
- refund_amount (DECIMAL)
- refund_method (TEXT)
- requested_at (TIMESTAMPTZ)
- processed_at (TIMESTAMPTZ)
- notes (TEXT)
```
**Purpose**: Handle product returns and refund processing

---

## 🔒 Security Features

### Row Level Security (RLS)
Every table has RLS policies that ensure:
- **Admins**: See everything
- **Merchants**: See only their own data
- **Customers**: See only their own orders/data

Example Policy:
```sql
-- Merchants can only see their own products
CREATE POLICY "Merchants can view own products"
ON products FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());
```

### Authentication
- Email/password login
- Session-based authentication
- JWT tokens for API access
- Password hashing (bcrypt)

---

## 📡 Realtime Features

### Enabled Tables
The following tables have realtime enabled:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### How Realtime Works
1. User places order → Inserted into `orders` table
2. Supabase Realtime broadcasts change
3. Merchant app receives instant notification
4. UI updates automatically

---

## 💾 LocalStorage (Fallback)

### Storage Keys
```javascript
'bb-users'          // User accounts
'bb-products'       // Product catalog
'bb-purchases'      // Purchase records
'bb-sales'          // Sales transactions
'bb-orders'         // Customer orders
'bb-customers'      // Customer database
'bb-notifications'  // Notifications
'bb-settings'       // App settings
'bb-auth-user'      // Current logged-in user
```

### When LocalStorage is Used
1. **No Supabase configured**: App works completely offline
2. **Network offline**: Data syncs when back online
3. **Quick access**: Frequently used data cached locally

---

## 🔄 Data Flow

### Example: Customer Places Order

```mermaid
Customer App (User)
    ↓ [Place Order]
Supabase Database
    ↓ [INSERT into orders]
Realtime Trigger
    ↓ [WebSocket broadcast]
Merchant App
    ↓ [Receive notification]
    • Play sound
    • Show notification
    • Update orders list
```

### Example: Merchant Updates Order Status

```mermaid
Merchant App
    ↓ [Update status to "preparing"]
Supabase Database
    ↓ [UPDATE orders.status]
Realtime Trigger
    ↓ [WebSocket broadcast]
Customer App
    ↓ [Receive update]
    • Update order tracking UI
    • Show "Your order is being prepared"
```

---

## 🛠️ Database Configuration

### Setup File
**Location**: `qcommerce-inventory/js/config.js`

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### Database Connection Code
**Location**: `qcommerce-inventory/js/db.js`

```javascript
// Initialize Supabase client
const supabaseClient = supabase.createClient(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY
);

// Example query
const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('merchant_id', userId);
```

---

## 📈 Database Size Estimates

### Free Tier Limits (Supabase)
- **Database size**: 500MB
- **Bandwidth**: 5GB/month
- **API requests**: Unlimited
- **Realtime connections**: 200 concurrent

### Estimated Capacity
With 500MB, you can store approximately:
- **Products**: ~50,000 products
- **Orders**: ~100,000 orders
- **Customers**: ~20,000 customers
- **Users**: ~10,000 users

---

## 🚀 Migration & Setup

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up / Log in
3. Create new project
4. Wait 2-3 minutes for database to provision

### Step 2: Run Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-schema-v3-billaxis.sql`
3. Paste and click "Run"
4. Verify tables in Table Editor

### Step 3: Configure App
1. Get Supabase URL and anon key from Settings → API
2. Update `qcommerce-inventory/js/config.js`
3. Save and reload app

---

## 🔍 Database Queries Examples

### Get All Products for Merchant
```javascript
const { data } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
```

### Get New Orders (Realtime)
```javascript
supabase
    .channel('merchant-orders')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `merchant_id=eq.${merchantId}`
    }, (payload) => {
        console.log('New order:', payload.new);
        showNotification(payload.new);
    })
    .subscribe();
```

### Calculate Merchant Earnings
```sql
SELECT 
    m.merchant_id,
    m.store_name,
    SUM(c.merchant_earnings) as total_earnings,
    SUM(c.commission_amount) as total_commission,
    COUNT(*) as total_orders
FROM commission_ledger c
JOIN stores m ON c.merchant_id = m.merchant_id
WHERE c.status = 'paid'
GROUP BY m.merchant_id, m.store_name;
```

---

## 📊 Summary

| Feature | Supabase (PostgreSQL) | LocalStorage |
|---------|----------------------|--------------|
| **Storage** | 500MB - Unlimited | 5-10MB |
| **Data Type** | Relational (SQL) | Key-Value (JSON) |
| **Offline Support** | ❌ Requires internet | ✅ Works offline |
| **Realtime** | ✅ Yes (WebSockets) | ❌ No |
| **Security** | ✅ RLS policies | ⚠️ Client-side only |
| **Multi-user** | ✅ Yes | ❌ Single browser |
| **Backup** | ✅ Automatic | ❌ Manual |
| **Cost** | Free - $25+/month | Free |
| **Best For** | Production | Development/Offline |

---

## 🎯 Recommendation

**Use Supabase for production** - It provides:
- Enterprise-grade PostgreSQL
- Built-in authentication
- Realtime capabilities
- Automatic backups
- Scalability

**Use LocalStorage as fallback** - For:
- Offline functionality
- Development without Supabase
- Quick prototyping

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Schema File**: `qcommerce-inventory/supabase-schema-v3-billaxis.sql`
- **Config File**: `qcommerce-inventory/js/config.js`
- **Database Module**: `qcommerce-inventory/js/db.js`

---

**Database Type**: PostgreSQL (via Supabase) + LocalStorage  
**Total Tables**: 13 tables  
**Security**: Row Level Security enabled  
**Realtime**: WebSocket-based subscriptions  
**Status**: ✅ Schema ready to deploy
