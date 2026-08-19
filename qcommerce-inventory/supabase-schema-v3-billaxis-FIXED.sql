-- ============================================================
--  BILLAXIS Q-Commerce Platform — Database Schema v3 (FIXED)
--  Multi-Role Architecture: Admin | Merchant | Customer
--  
--  FIXED: Works with Supabase Auth (doesn't modify auth.users)
-- ============================================================

-- ══════════════════════════════════════════════════════════
--  STEP 1: Create Profiles Table (separate from auth.users)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'merchant',
    merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_merchant_id ON public.profiles(merchant_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 2: Create/Update Users Table (for backward compatibility)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users are viewable by authenticated users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own record"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 3: Merchant/Store Profiles
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stores (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name         TEXT NOT NULL,
    store_type         TEXT DEFAULT 'dark_store',
    phone              TEXT,
    email              TEXT,
    address            TEXT,
    city               TEXT,
    state              TEXT,
    pincode            TEXT,
    latitude           DECIMAL(10, 8),
    longitude          DECIMAL(11, 8),
    
    -- Business details
    gst_number         TEXT,
    fssai_number       TEXT,
    opening_time       TIME DEFAULT '09:00',
    closing_time       TIME DEFAULT '21:00',
    working_days       TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
    
    -- Settings
    delivery_radius_km DECIMAL(5, 2) DEFAULT 5.0,
    min_order_amount   DECIMAL(10, 2) DEFAULT 0,
    delivery_fee       DECIMAL(10, 2) DEFAULT 0,
    free_delivery_above DECIMAL(10, 2) DEFAULT 0,
    commission_rate    DECIMAL(5, 2) DEFAULT 10.0,
    
    -- Status
    is_active          BOOLEAN DEFAULT TRUE,
    is_verified        BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    logo_url           TEXT,
    banner_url         TEXT,
    description        TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_merchant ON public.stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_location ON public.stores(latitude, longitude);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can manage own stores"
    ON public.stores FOR ALL
    TO authenticated
    USING (merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 4: Products Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.products (
    id            TEXT PRIMARY KEY,
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id      UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    sku           TEXT UNIQUE,
    name          TEXT NOT NULL,
    category      TEXT,
    unit          TEXT,
    min_stock     INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    supplier      TEXT,
    barcode       TEXT,
    image         TEXT,
    cost_price    DECIMAL(10, 2),
    selling_price DECIMAL(10, 2),
    expiry_date   DATE,
    has_expiry    BOOLEAN DEFAULT FALSE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
    ON public.products FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

CREATE POLICY "Users can manage own products"
    ON public.products FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 5: Orders Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orders (
    id                  TEXT PRIMARY KEY,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    store_id            UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    order_id_label      TEXT,
    order_type          TEXT DEFAULT 'offline',
    customer            TEXT,
    phone               TEXT,
    address             TEXT,
    items               JSONB,
    subtotal            DECIMAL(10, 2) DEFAULT 0,
    total_cost          DECIMAL(10, 2) DEFAULT 0,
    profit              DECIMAL(10, 2) DEFAULT 0,
    delivery_fee        DECIMAL(10, 2) DEFAULT 0,
    total               DECIMAL(10, 2) DEFAULT 0,
    payment             TEXT DEFAULT 'cash',
    payment_status      TEXT DEFAULT 'pending',
    status              TEXT DEFAULT 'new',
    timeline            JSONB,
    notes               TEXT,
    date                TIMESTAMPTZ DEFAULT NOW(),
    target_delivery_time TIMESTAMPTZ,
    picked_at           TIMESTAMPTZ,
    packed_at           TIMESTAMPTZ,
    dispatched_at       TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid() OR customer_id = auth.uid());

CREATE POLICY "Users can manage own orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 6: Purchases Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.purchases (
    id            TEXT PRIMARY KEY,
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id      UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    product_id    TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    product_name  TEXT,
    quantity      INTEGER NOT NULL,
    cost_price    DECIMAL(10, 2) NOT NULL,
    total_cost    DECIMAL(10, 2) NOT NULL,
    supplier      TEXT,
    date          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_merchant ON public.purchases(merchant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON public.purchases(product_id);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

CREATE POLICY "Users can manage own purchases"
    ON public.purchases FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 7: Sales Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sales (
    id             TEXT PRIMARY KEY,
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id       UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    product_id     TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    product_name   TEXT,
    quantity       INTEGER NOT NULL,
    cost_price     DECIMAL(10, 2) NOT NULL,
    selling_price  DECIMAL(10, 2) NOT NULL,
    profit         DECIMAL(10, 2) NOT NULL,
    customer_name  TEXT,
    payment_method TEXT DEFAULT 'cash',
    date           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_merchant ON public.sales(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON public.sales(product_id);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales"
    ON public.sales FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

CREATE POLICY "Users can manage own sales"
    ON public.sales FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 8: Customers Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.customers (
    id              TEXT PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id        UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    total_orders    INTEGER DEFAULT 0,
    total_spent     DECIMAL(10, 2) DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON public.customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

CREATE POLICY "Users can manage own customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR merchant_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 9: Product Batches Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_batches (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number    TEXT,
    quantity        INTEGER NOT NULL,
    cost_price      DECIMAL(10, 2) NOT NULL,
    mfg_date        DATE,
    expiry_date     DATE,
    supplier        TEXT,
    received_date   TIMESTAMPTZ DEFAULT NOW(),
    remaining_quantity INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_batches_product ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.product_batches(expiry_date);

-- Enable RLS
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view batches"
    ON public.product_batches FOR SELECT
    TO authenticated
    USING (true);

-- ══════════════════════════════════════════════════════════
--  STEP 10: Notifications Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id              TEXT PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    data            JSONB,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 11: Enable Realtime
-- ══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ══════════════════════════════════════════════════════════
--  DONE! 🎉
-- ══════════════════════════════════════════════════════════

-- Success message
SELECT 'BILLAXIS Database Setup Complete! 🎉' as status;
