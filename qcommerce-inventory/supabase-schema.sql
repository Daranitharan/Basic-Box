-- ============================================================
--  Basics Box – Supabase Database Schema
--  Paste this entire file into:
--    Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Users table (extends Supabase Auth) ─────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Products ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id            TEXT PRIMARY KEY,
    user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sku           TEXT NOT NULL,
    name          TEXT NOT NULL,
    category      TEXT,
    unit          TEXT DEFAULT 'pcs',
    min_stock     INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    supplier      TEXT,
    barcode       TEXT,
    image         TEXT,        -- base64 or URL
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Purchases (Buy Stock) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
    id             TEXT PRIMARY KEY,
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.sales (
    id             TEXT PRIMARY KEY,
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE CASCADE,
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
-- Each user can only see and modify their own data.

ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales    ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users: own row only"
    ON public.users FOR ALL
    USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Products: own rows only"
    ON public.products FOR ALL
    USING (auth.uid() = user_id);

-- Purchases policies
CREATE POLICY "Purchases: own rows only"
    ON public.purchases FOR ALL
    USING (auth.uid() = user_id);

-- Sales policies
CREATE POLICY "Sales: own rows only"
    ON public.sales FOR ALL
    USING (auth.uid() = user_id);

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

-- ── 7. Auto-create user profile on signup ───────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
