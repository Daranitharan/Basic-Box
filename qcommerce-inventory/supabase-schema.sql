-- ============================================================
--  Basics Box – Supabase Database Schema (FIXED)
--  Paste this entire file into:
--    Supabase Dashboard → SQL Editor → New Query → Run
--
--  FIX: All id / foreign-key columns use TEXT (not UUID)
--       because the JS app generates IDs with Date.now().toString()
-- ============================================================

-- ── 1. Users table (extends Supabase Auth) ──────────────────
--  auth.users.id is UUID, so we keep users.id as UUID.
--  All other tables reference user_id as UUID too.
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Products ──────────────────────────────────────────────
--  id is TEXT (JS generates Date.now().toString())
CREATE TABLE IF NOT EXISTS public.products (
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

-- ── 3. Purchases (Buy Stock) ─────────────────────────────────
--  product_id references products.id → both TEXT
CREATE TABLE IF NOT EXISTS public.purchases (
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

-- ── 4. Sales (Sell Stock) ────────────────────────────────────
--  product_id references products.id → both TEXT
CREATE TABLE IF NOT EXISTS public.sales (
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

-- ── 5. Row-Level Security (RLS) ──────────────────────────────
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own"     ON public.users     FOR ALL USING (auth.uid() = id);
CREATE POLICY "products_own"  ON public.products  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "purchases_own" ON public.purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sales_own"     ON public.sales     FOR ALL USING (auth.uid() = user_id);

-- ── 6. Auto-update updated_at on products ───────────────────
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

-- ── 7. Auto-create user profile row on sign-up ──────────────
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

-- Drop old trigger first in case it already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
