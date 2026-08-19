-- ============================================================
--  BILLAXIS Q-Commerce Platform — Complete Database Schema v3
--  Multi-Role Architecture: Admin | Merchant | Customer
--  
--  SAFE TO RUN: This is an ADDITIVE migration that preserves
--  existing data (users, products, purchases, sales, orders)
-- ============================================================

-- ══════════════════════════════════════════════════════════
--  STEP 1: Enhanced Profiles with Roles
-- ══════════════════════════════════════════════════════════

-- Add role support to existing users table (safe if columns exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'merchant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.users ADD COLUMN merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'avatar') THEN
        ALTER TABLE public.users ADD COLUMN avatar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_merchant_id ON public.users(merchant_id);

-- ══════════════════════════════════════════════════════════
--  STEP 2: Merchant/Store Profiles
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stores (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ══════════════════════════════════════════════════════════
--  STEP 3: Enhanced Products with Expiry & Batch Tracking
-- ══════════════════════════════════════════════════════════

DO $$ 
BEGIN
    -- Add merchant_id to products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.products ADD COLUMN merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        -- Migrate existing: set merchant_id = user_id
        UPDATE public.products SET merchant_id = user_id WHERE merchant_id IS NULL;
    END IF;
    
    -- Add store_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
    END IF;
    
    -- Add pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE public.products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'selling_price') THEN
        ALTER TABLE public.products ADD COLUMN selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'mrp') THEN
        ALTER TABLE public.products ADD COLUMN mrp DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add expiry tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'has_expiry') THEN
        ALTER TABLE public.products ADD COLUMN has_expiry BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'expiry_alert_days') THEN
        ALTER TABLE public.products ADD COLUMN expiry_alert_days INTEGER DEFAULT 30;
    END IF;
    
    -- Add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_featured') THEN
        ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_merchant ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- ══════════════════════════════════════════════════════════
--  STEP 4: Product Batches (for expiry tracking)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_batches (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    merchant_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_number    TEXT NOT NULL,
    quantity        INTEGER NOT NULL,
    cost_price      DECIMAL(10, 2) NOT NULL,
    manufacturing_date DATE,
    expiry_date     DATE,
    supplier        TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_product ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_merchant ON public.product_batches(merchant_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.product_batches(expiry_date);

-- ══════════════════════════════════════════════════════════
--  STEP 5: Enhanced Orders with Multi-Role Support
-- ══════════════════════════════════════════════════════════

DO $$ 
BEGIN
    -- Add customer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'customer_id') THEN
        ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add merchant_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.orders ADD COLUMN merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        -- Migrate existing: set merchant_id = user_id
        UPDATE public.orders SET merchant_id = user_id WHERE merchant_id IS NULL;
    END IF;
    
    -- Add store_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'store_id') THEN
        ALTER TABLE public.orders ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
    END IF;
    
    -- Add delivery partner
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_partner_id') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add timestamps for SLA tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'accepted_at') THEN
        ALTER TABLE public.orders ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'prepared_at') THEN
        ALTER TABLE public.orders ADD COLUMN prepared_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'dispatched_at') THEN
        ALTER TABLE public.orders ADD COLUMN dispatched_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Add SLA target
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'target_delivery_time') THEN
        ALTER TABLE public.orders ADD COLUMN target_delivery_time TIMESTAMPTZ;
    END IF;
    
    -- Add commission
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'commission_amount') THEN
        ALTER TABLE public.orders ADD COLUMN commission_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'merchant_net') THEN
        ALTER TABLE public.orders ADD COLUMN merchant_net DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add cancellation reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE public.orders ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_partner ON public.orders(delivery_partner_id);

-- ══════════════════════════════════════════════════════════
--  STEP 6: Delivery Partners
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id              UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type    TEXT DEFAULT 'bike',
    vehicle_number  TEXT,
    license_number  TEXT,
    
    -- Location tracking
    current_lat     DECIMAL(10, 8),
    current_lng     DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,
    
    -- Status
    is_available    BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    
    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    rating          DECIMAL(3, 2) DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_merchant ON public.delivery_partners(merchant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_available ON public.delivery_partners(is_available);

-- ══════════════════════════════════════════════════════════
--  STEP 7: Notifications
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id              TEXT PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL, -- 'order_new', 'order_status', 'low_stock', 'expiry_alert'
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    data            JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    is_sent_email   BOOLEAN DEFAULT FALSE,
    is_sent_push    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- ══════════════════════════════════════════════════════════
--  STEP 8: Commission Settings & Tracking
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rate_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
    is_active       BOOLEAN DEFAULT TRUE,
    effective_from  DATE DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(merchant_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_total     DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    merchant_net    DECIMAL(10, 2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_merchant ON public.commission_ledger(merchant_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_order ON public.commission_ledger(order_id);

-- ══════════════════════════════════════════════════════════
--  STEP 9: Returns & Refunds
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.returns (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Items being returned
    items           JSONB NOT NULL DEFAULT '[]',
    
    -- Reason
    reason          TEXT NOT NULL,
    reason_detail   TEXT,
    images          TEXT[], -- URLs to uploaded images
    
    -- Amounts
    return_amount   DECIMAL(10, 2) NOT NULL,
    refund_amount   DECIMAL(10, 2),
    
    -- Status: 'requested', 'approved', 'rejected', 'picked_up', 'refunded'
    status          TEXT DEFAULT 'requested',
    
    -- Resolution
    resolution_notes TEXT,
    approved_by     UUID REFERENCES public.users(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON public.returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_merchant ON public.returns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);

-- ══════════════════════════════════════════════════════════
--  STEP 10: Update RLS Policies (Multi-Role)
-- ══════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "orders_own" ON public.orders;
DROP POLICY IF EXISTS "products_own" ON public.products;

-- ── Stores RLS ──
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_merchant_full_access" ON public.stores
    FOR ALL
    USING (auth.uid() = merchant_id);

CREATE POLICY "stores_admin_full_access" ON public.stores
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "stores_public_read" ON public.stores
    FOR SELECT
    USING (is_active = true);

-- ── Products RLS ──
CREATE POLICY "products_merchant_full_access" ON public.products
    FOR ALL
    USING (auth.uid() = merchant_id OR auth.uid() = user_id);

CREATE POLICY "products_admin_full_access" ON public.products
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "products_customer_read_active" ON public.products
    FOR SELECT
    USING (is_active = true);

-- ── Orders RLS ──
CREATE POLICY "orders_customer_own" ON public.orders
    FOR ALL
    USING (
        auth.uid() = customer_id OR 
        auth.uid() = user_id
    );

CREATE POLICY "orders_merchant_own" ON public.orders
    FOR ALL
    USING (
        auth.uid() = merchant_id OR 
        auth.uid() = user_id
    );

CREATE POLICY "orders_admin_full_access" ON public.orders
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "orders_delivery_partner_read" ON public.orders
    FOR SELECT
    USING (auth.uid() = delivery_partner_id);

-- ── Notifications RLS ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON public.notifications
    FOR ALL
    USING (auth.uid() = user_id);

-- ── Batches RLS ──
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_merchant_own" ON public.product_batches
    FOR ALL
    USING (auth.uid() = merchant_id);

CREATE POLICY "batches_admin_full_access" ON public.product_batches
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Delivery Partners RLS ──
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_partners_own" ON public.delivery_partners
    FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "delivery_partners_merchant_read" ON public.delivery_partners
    FOR SELECT
    USING (auth.uid() = merchant_id);

CREATE POLICY "delivery_partners_admin_full_access" ON public.delivery_partners
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Returns RLS ──
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns_customer_own" ON public.returns
    FOR ALL
    USING (auth.uid() = customer_id);

CREATE POLICY "returns_merchant_own" ON public.returns
    FOR ALL
    USING (auth.uid() = merchant_id);

CREATE POLICY "returns_admin_full_access" ON public.returns
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ── Commission RLS ──
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_settings_merchant_read" ON public.commission_settings
    FOR SELECT
    USING (auth.uid() = merchant_id);

CREATE POLICY "commission_settings_admin_full" ON public.commission_settings
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "commission_ledger_merchant_read" ON public.commission_ledger
    FOR SELECT
    USING (auth.uid() = merchant_id);

CREATE POLICY "commission_ledger_admin_full" ON public.commission_ledger
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ══════════════════════════════════════════════════════════
--  STEP 11: Realtime Publication (Enable for all tables)
-- ══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;

-- ══════════════════════════════════════════════════════════
--  STEP 12: Utility Functions
-- ══════════════════════════════════════════════════════════

-- Function to calculate order commission
CREATE OR REPLACE FUNCTION calculate_order_commission(p_merchant_id UUID, p_order_total DECIMAL)
RETURNS TABLE(rate DECIMAL, amount DECIMAL, net DECIMAL) AS $$
DECLARE
    v_rate DECIMAL(5,2);
BEGIN
    -- Get current commission rate for merchant
    SELECT rate_percentage INTO v_rate
    FROM public.commission_settings
    WHERE merchant_id = p_merchant_id 
      AND is_active = true
      AND effective_from <= CURRENT_DATE
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- Default to 10% if not set
    IF v_rate IS NULL THEN
        v_rate := 10.0;
    END IF;
    
    RETURN QUERY SELECT 
        v_rate,
        ROUND(p_order_total * v_rate / 100, 2),
        ROUND(p_order_total - (p_order_total * v_rate / 100), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════
--  STEP 13: Sample Data (Optional - for testing)
-- ══════════════════════════════════════════════════════════

-- Uncomment below to insert sample admin user
-- INSERT INTO public.users (id, name, email, role, is_active)
-- VALUES (
--     gen_random_uuid(),
--     'Admin User',
--     'admin@billaxis.com',
--     'admin',
--     true
-- ) ON CONFLICT (email) DO NOTHING;

-- ══════════════════════════════════════════════════════════
--  MIGRATION COMPLETE ✓
-- ══════════════════════════════════════════════════════════
-- 
--  What's New:
--  ✓ Multi-role support (admin, merchant, customer)
--  ✓ Store profiles with geolocation
--  ✓ Product batches with expiry tracking
--  ✓ Enhanced orders with SLA timestamps
--  ✓ Delivery partner management
--  ✓ Notifications system
--  ✓ Commission calculation
--  ✓ Returns & refunds
--  ✓ Proper RLS for all roles
--  ✓ Realtime enabled
--
--  Next Steps:
--  1. Run this SQL in Supabase SQL Editor
--  2. Update frontend code to use new schema
--  3. Build User App and Admin App
--  4. Implement Edge Functions for emails
--
-- ══════════════════════════════════════════════════════════
