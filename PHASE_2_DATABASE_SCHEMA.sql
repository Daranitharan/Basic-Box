-- ============================================================
--  BILLAXIS Q-COMMERCE - PHASE 2 ENHANCEMENTS
--  Database Schema for Advanced Features
--  
--  Features Covered:
--  1. Hyperlocal & Discovery (Location-based)
--  2. Inventory Reliability (Stock Reservation)
--  3. Fulfillment Speed (SLA Tracking)
--  4. Business Logic (Commission System)
--  5. Delivery Operations (Rider Management)
--  6. Growth & Trust (Promo, Referral, Reviews)
--  7. Enhanced Notifications
-- ============================================================

-- ══════════════════════════════════════════════════════════
--  PHASE 2.1: HYPERLOCAL & DISCOVERY
-- ══════════════════════════════════════════════════════════

-- Add location fields to users table (for customer location)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'customer'; -- 'customer', 'merchant', 'admin', 'rider'

-- Create stores/merchants table for location-based discovery
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_description TEXT,
    store_image TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT,
    
    -- Service area
    service_radius_km DECIMAL(5, 2) DEFAULT 5.0, -- Can deliver within 5km
    is_active BOOLEAN DEFAULT true,
    is_accepting_orders BOOLEAN DEFAULT true,
    
    -- Business hours
    opens_at TIME,
    closes_at TIME,
    
    -- Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    
    -- Performance
    avg_preparation_time_minutes INTEGER DEFAULT 30,
    total_orders_completed INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviceability zones (for future expansion)
CREATE TABLE IF NOT EXISTS public.serviceable_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    pincode TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    estimated_delivery_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
--  PHASE 2.2: INVENTORY RELIABILITY
-- ══════════════════════════════════════════════════════════

-- Stock reservations table (prevents overselling)
CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    quantity INTEGER NOT NULL,
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- Auto-release after 15 mins if not confirmed
    status TEXT DEFAULT 'reserved', -- 'reserved', 'confirmed', 'released', 'expired'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add reserved stock tracking to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED;

-- ══════════════════════════════════════════════════════════
--  PHASE 2.3: FULFILLMENT SPEED (SLA TRACKING)
-- ══════════════════════════════════════════════════════════

-- Add SLA tracking fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_time TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparation_completed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delay_reason TEXT;

-- Order SLA events log
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'placed', 'accepted', 'preparing', 'ready', 'picked', 'delivered', 'cancelled'
    event_description TEXT,
    triggered_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
--  PHASE 2.4: BUSINESS LOGIC (COMMISSION SYSTEM)
-- ══════════════════════════════════════════════════════════

-- Commission settings
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5, 2) DEFAULT 15.00, -- 15% default
    delivery_fee_share_percentage DECIMAL(5, 2) DEFAULT 100.00, -- Merchant gets 100% of delivery fee by default
    payment_gateway_fee_percentage DECIMAL(5, 2) DEFAULT 2.00,
    
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout tracking for merchants
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Financial breakdown
    total_order_value NUMERIC(12, 2) DEFAULT 0,
    total_commission NUMERIC(12, 2) DEFAULT 0,
    total_delivery_fees_collected NUMERIC(12, 2) DEFAULT 0,
    delivery_fee_share NUMERIC(12, 2) DEFAULT 0,
    payment_gateway_fees NUMERIC(12, 2) DEFAULT 0,
    
    net_payout NUMERIC(12, 2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
    payment_reference TEXT,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add commission tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_earnings NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_earnings NUMERIC(10, 2) DEFAULT 0;

-- ══════════════════════════════════════════════════════════
--  PHASE 2.5: DELIVERY OPERATIONS
-- ══════════════════════════════════════════════════════════

-- Delivery partners / riders
CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Basic info
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT, -- 'bicycle', 'bike', 'scooter', 'car'
    vehicle_number TEXT,
    
    -- Current location (updated in real-time)
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,
    
    -- Status
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true, -- false when on active delivery
    current_order_id TEXT REFERENCES public.orders(id),
    
    -- Performance
    total_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    on_time_delivery_percentage DECIMAL(5, 2) DEFAULT 100.00,
    
    -- Documents
    id_proof_url TEXT,
    vehicle_rc_url TEXT,
    driving_license_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery assignments
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id),
    
    -- Pickup location
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT NOT NULL,
    
    -- Drop location
    drop_latitude DECIMAL(10, 8) NOT NULL,
    drop_longitude DECIMAL(11, 8) NOT NULL,
    drop_address TEXT NOT NULL,
    
    -- Delivery flow
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    reached_store_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    on_the_way_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Distance & fees
    estimated_distance_km DECIMAL(5, 2),
    actual_distance_km DECIMAL(5, 2),
    delivery_fee NUMERIC(10, 2),
    rider_earning NUMERIC(10, 2),
    
    -- Status
    status TEXT DEFAULT 'assigned', -- 'assigned', 'accepted', 'at_store', 'picked', 'on_way', 'delivered', 'cancelled'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add rider tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.delivery_partners(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;

-- ══════════════════════════════════════════════════════════
--  PHASE 2.6: GROWTH & TRUST
-- ══════════════════════════════════════════════════════════

-- Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Discount rules
    discount_type TEXT NOT NULL, -- 'percentage', 'flat', 'free_delivery'
    discount_value NUMERIC(10, 2) NOT NULL,
    max_discount_amount NUMERIC(10, 2),
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Usage limits
    max_total_usage INTEGER,
    current_usage INTEGER DEFAULT 0,
    max_usage_per_user INTEGER DEFAULT 1,
    
    -- Applicable to
    applicable_to_store_ids UUID[], -- NULL = all stores
    applicable_to_new_users_only BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS public.promo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    discount_amount NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add promo tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(10, 2) DEFAULT 0;

-- Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    referral_code TEXT NOT NULL UNIQUE,
    
    -- Rewards
    referrer_reward_amount NUMERIC(10, 2) DEFAULT 50.00,
    referred_reward_amount NUMERIC(10, 2) DEFAULT 50.00,
    
    referrer_reward_given BOOLEAN DEFAULT false,
    referred_reward_given BOOLEAN DEFAULT false,
    
    -- Status
    referred_user_signed_up_at TIMESTAMPTZ,
    referred_user_first_order_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order ratings & reviews
CREATE TABLE IF NOT EXISTS public.order_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
    
    -- Ratings (1-5 stars)
    store_rating INTEGER CHECK (store_rating BETWEEN 1 AND 5),
    rider_rating INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
    
    -- Reviews
    store_review TEXT,
    rider_review TEXT,
    
    -- Issues
    reported_issues TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
--  PHASE 2.7: ENHANCED NOTIFICATIONS
-- ══════════════════════════════════════════════════════════

-- Notifications table (in-app + push token storage)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'order_placed', 'order_accepted', 'order_ready', 'order_delivered', 'promo', 'general'
    
    -- Related entities
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    
    -- Actions
    action_url TEXT,
    action_label TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Delivery channels
    sent_in_app BOOLEAN DEFAULT true,
    sent_push BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    sent_whatsapp BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tokens (for FCM/APNS)
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    device_token TEXT NOT NULL,
    device_type TEXT NOT NULL, -- 'ios', 'android', 'web'
    device_id TEXT,
    
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, device_token)
);

-- ══════════════════════════════════════════════════════════
--  INDEXES FOR PERFORMANCE
-- ══════════════════════════════════════════════════════════

-- Location-based queries
CREATE INDEX IF NOT EXISTS idx_stores_location ON public.stores(latitude, longitude) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_riders_location ON public.delivery_partners(current_latitude, current_longitude) WHERE is_online = true;

-- Order queries
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_date ON public.orders(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status) WHERE status != 'delivered';

-- Stock reservations
CREATE INDEX IF NOT EXISTS idx_reservations_product ON public.stock_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON public.stock_reservations(expires_at) WHERE status = 'reserved';

-- Promo codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON public.promo_usage(user_id, promo_code_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;

-- Delivery assignments
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_rider ON public.delivery_assignments(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order ON public.delivery_assignments(order_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_store ON public.order_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rider ON public.order_reviews(rider_id);

-- ══════════════════════════════════════════════════════════
--  SUCCESS MESSAGE
-- ══════════════════════════════════════════════════════════

SELECT 
    '✅ Phase 2 Database Schema Created Successfully!' as status,
    'All tables, columns, and indexes have been added.' as message;
