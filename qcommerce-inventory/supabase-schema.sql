-- ============================================================
--  Basics Box – Supabase Database Schema (CLEAN RESET)
--  Step 1: Drop everything that may exist from previous runs
--  Step 2: Recreate all tables with correct types
-- ============================================================

-- ── STEP 1: Drop everything cleanly ─────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS products_updated_at    ON public.products;

DROP FUNCTION IF EXISTS handle_new_user()     CASCADE;
DROP FUNCTION IF EXISTS update_updated_at()   CASCADE;

DROP TABLE IF EXISTS public.sales     CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.products  CASCADE;
DROP TABLE IF EXISTS public.users     CASCADE;

-- ── STEP 2: Recreate tables ──────────────────────────────────

-- 1. Users (id = UUID, mirrors auth.users)
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products (id = TEXT — JS uses Date.now().toString())
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

-- 3. Purchases (product_id = TEXT → matches products.id)
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

-- 4. Sales (product_id = TEXT → matches products.id)
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

-- ── STEP 3: Row-Level Security ───────────────────────────────
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own"     ON public.users     FOR ALL USING (auth.uid() = id);
CREATE POLICY "products_own"  ON public.products  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "purchases_own" ON public.purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sales_own"     ON public.sales     FOR ALL USING (auth.uid() = user_id);

-- ── STEP 4: Auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── STEP 5: Auto-create user profile on sign-up ─────────────
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
