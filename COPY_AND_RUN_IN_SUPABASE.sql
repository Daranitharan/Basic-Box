-- ============================================================
--  STEP 1: CLEANUP - Remove any existing tables
--  Copy and paste this FIRST, then click "Run"
-- ============================================================

DROP TABLE IF EXISTS public.stock_adjustments CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.product_batches CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.delivery_partners CASCADE;
DROP TABLE IF EXISTS public.commission_settings CASCADE;
DROP TABLE IF EXISTS public.commission_ledger CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;

-- Wait for "Success. No rows returned" message, then continue to Step 2


-- ============================================================
--  STEP 2: CREATE TABLES - Full Schema
--  After Step 1 completes, copy this ENTIRE section and run it
-- ============================================================

-- ── Users Table ──────────────────────────────────────────────
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products Table ───────────────────────────────────────────
CREATE TABLE public.products (
    id            TEXT PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sku           TEXT NOT NULL,
    name          TEXT NOT NULL,
    category      TEXT,
    unit          TEXT DEFAULT 'pcs',
    min_stock     INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    supplier      TEXT,
    barcode       TEXT,
    image         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Purchases Table ──────────────────────────────────────────
CREATE TABLE public.purchases (
    id             TEXT PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name   TEXT NOT NULL,
    sku            TEXT,
    quantity       INTEGER NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL,
    total_cost     NUMERIC(12,2) NOT NULL,
    supplier       TEXT,
    notes          TEXT,
    date           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sales Table ──────────────────────────────────────────────
CREATE TABLE public.sales (
    id             TEXT PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name   TEXT NOT NULL,
    sku            TEXT,
    quantity       INTEGER NOT NULL,
    selling_price  NUMERIC(12,2) NOT NULL,
    total_amount   NUMERIC(12,2) NOT NULL,
    cost_price     NUMERIC(12,2) DEFAULT 0,
    profit         NUMERIC(12,2) DEFAULT 0,
    customer       TEXT,
    notes          TEXT,
    date           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Orders Table ─────────────────────────────────────────────
CREATE TABLE public.orders (
    id              TEXT PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id_label  TEXT NOT NULL,
    order_type      TEXT DEFAULT 'offline',
    customer        TEXT,
    phone           TEXT,
    address         TEXT,
    items           JSONB NOT NULL DEFAULT '[]',
    subtotal        NUMERIC(12,2) DEFAULT 0,
    total_cost      NUMERIC(12,2) DEFAULT 0,
    profit          NUMERIC(12,2) DEFAULT 0,
    delivery_fee    NUMERIC(12,2) DEFAULT 0,
    total           NUMERIC(12,2) DEFAULT 0,
    payment         TEXT DEFAULT 'cash',
    payment_status  TEXT DEFAULT 'pending',
    status          TEXT DEFAULT 'new',
    timeline        JSONB DEFAULT '[]',
    notes           TEXT,
    date            TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ── Stock Adjustments Table ──────────────────────────────────
CREATE TABLE public.stock_adjustments (
    id           TEXT PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id   TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku          TEXT,
    before_qty   INTEGER NOT NULL,
    after_qty    INTEGER NOT NULL,
    change_qty   INTEGER NOT NULL,
    adj_type     TEXT NOT NULL,
    reason       TEXT NOT NULL,
    notes        TEXT,
    date         TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
--  STEP 3: Enable Row-Level Security (RLS)
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
--  STEP 4: Create RLS Policies
-- ══════════════════════════════════════════════════════════

-- Users policies
CREATE POLICY "users_own" ON public.users 
    FOR ALL USING (auth.uid() = id);

-- Products policies
CREATE POLICY "products_own" ON public.products 
    FOR ALL USING (auth.uid() = user_id);

-- Purchases policies
CREATE POLICY "purchases_own" ON public.purchases 
    FOR ALL USING (auth.uid() = user_id);

-- Sales policies
CREATE POLICY "sales_own" ON public.sales 
    FOR ALL USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "orders_own" ON public.orders 
    FOR ALL USING (auth.uid() = user_id);

-- Stock adjustments policies
CREATE POLICY "adjustments_own" ON public.stock_adjustments 
    FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
--  STEP 5: Create Functions & Triggers
-- ══════════════════════════════════════════════════════════

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply to products table
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════════════════════
--  STEP 6: Enable Realtime (for live order notifications)
-- ══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ══════════════════════════════════════════════════════════
--  ✅ DONE! Database Setup Complete
-- ══════════════════════════════════════════════════════════

SELECT 
    '✅ BILLAXIS Database Setup Complete!' as status,
    'Your app will now save products to Supabase!' as message;
