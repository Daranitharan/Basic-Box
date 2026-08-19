-- ============================================================
--  BILLAXIS - SIMPLE Database Schema (Works with Existing Data)
--  Safe to run multiple times - won't break existing tables
-- ============================================================

-- ══════════════════════════════════════════════════════════
--  STEP 1: Create Basic Tables (if they don't exist)
-- ══════════════════════════════════════════════════════════

-- Users table (for backward compatibility with localStorage)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id UUID,
    sku TEXT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    min_stock INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    supplier TEXT,
    barcode TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID,
    order_id_label TEXT,
    order_type TEXT DEFAULT 'offline',
    customer TEXT,
    phone TEXT,
    address TEXT,
    items JSONB,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    profit DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    payment TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'new',
    timeline JSONB,
    notes TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    user_id UUID,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    supplier TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    user_id UUID,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    profit DECIMAL(10, 2) NOT NULL,
    customer_name TEXT,
    payment_method TEXT DEFAULT 'cash',
    date TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    user_id UUID,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
--  STEP 2: Create Indexes (safe - only if they don't exist)
-- ══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);

-- ══════════════════════════════════════════════════════════
--  STEP 3: Enable Row Level Security (RLS)
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
--  STEP 4: Create RLS Policies (drop if exist, then recreate)
-- ══════════════════════════════════════════════════════════

-- Drop existing policies (safe - won't error if they don't exist)
DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can manage own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can manage own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;

-- Create policies
CREATE POLICY "Users are viewable by authenticated users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own record"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view own products"
    ON public.products FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own products"
    ON public.products FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own purchases"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own purchases"
    ON public.purchases FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own sales"
    ON public.sales FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sales"
    ON public.sales FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════
--  STEP 5: Enable Realtime for Key Tables
-- ══════════════════════════════════════════════════════════

-- Enable Realtime (safe - won't error if already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ══════════════════════════════════════════════════════════
--  DONE! ✅
-- ══════════════════════════════════════════════════════════

SELECT 'BILLAXIS Database Setup Complete! ✅' as status,
       'Your products will now save to Supabase!' as message;
