-- ============================================================
--  BILLAXIS Q-COMMERCE - PHASE 2 RLS POLICIES
--  Row Level Security for all Phase 2 tables
-- ============================================================

-- ══════════════════════════════════════════════════════════
--  STORES TABLE
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own stores
CREATE POLICY "merchants_manage_own_stores" ON public.stores
    FOR ALL
    USING (auth.uid() = merchant_id);

-- Everyone can view active stores (for discovery)
CREATE POLICY "public_view_active_stores" ON public.stores
    FOR SELECT
    USING (is_active = true);

-- ══════════════════════════════════════════════════════════
--  SERVICEABLE AREAS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.serviceable_areas ENABLE ROW LEVEL SECURITY;

-- Merchants manage their store's serviceable areas
CREATE POLICY "merchants_manage_serviceable_areas" ON public.serviceable_areas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = serviceable_areas.store_id
            AND stores.merchant_id = auth.uid()
        )
    );

-- Public can view active serviceable areas
CREATE POLICY "public_view_serviceable_areas" ON public.serviceable_areas
    FOR SELECT
    USING (is_active = true);

-- ══════════════════════════════════════════════════════════
--  STOCK RESERVATIONS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- Users can view their own reservations
CREATE POLICY "users_view_own_reservations" ON public.stock_reservations
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can create reservations (handled by Edge Function)
CREATE POLICY "system_create_reservations" ON public.stock_reservations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- System can update reservations
CREATE POLICY "system_update_reservations" ON public.stock_reservations
    FOR UPDATE
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.products
        WHERE products.id = stock_reservations.product_id
        AND products.user_id = auth.uid()
    ));

-- ══════════════════════════════════════════════════════════
--  ORDER EVENTS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their orders
CREATE POLICY "users_view_order_events" ON public.order_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_events.order_id
            AND (orders.user_id = auth.uid() OR 
                 orders.store_id IN (
                     SELECT id FROM public.stores WHERE merchant_id = auth.uid()
                 ))
        )
    );

-- System can create events
CREATE POLICY "system_create_order_events" ON public.order_events
    FOR INSERT
    WITH CHECK (true); -- Controlled by Edge Functions

-- ══════════════════════════════════════════════════════════
--  COMMISSION SETTINGS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Merchants can view their commission settings
CREATE POLICY "merchants_view_commission_settings" ON public.commission_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = commission_settings.store_id
            AND stores.merchant_id = auth.uid()
        )
    );

-- Only admins can modify commission settings (handled by Edge Function)
CREATE POLICY "admins_manage_commission_settings" ON public.commission_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- ══════════════════════════════════════════════════════════
--  PAYOUTS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own payouts
CREATE POLICY "merchants_view_own_payouts" ON public.payouts
    FOR SELECT
    USING (auth.uid() = merchant_id);

-- Only system/admin can create/update payouts
CREATE POLICY "admins_manage_payouts" ON public.payouts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- ══════════════════════════════════════════════════════════
--  DELIVERY PARTNERS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

-- Riders can manage their own profile
CREATE POLICY "riders_manage_own_profile" ON public.delivery_partners
    FOR ALL
    USING (auth.uid() = user_id);

-- Merchants/system can view riders (for assignment)
CREATE POLICY "system_view_riders" ON public.delivery_partners
    FOR SELECT
    USING (is_verified = true);

-- ══════════════════════════════════════════════════════════
--  DELIVERY ASSIGNMENTS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- Riders can view their assignments
CREATE POLICY "riders_view_own_assignments" ON public.delivery_assignments
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM public.delivery_partners WHERE id = rider_id
    ));

-- Riders can update their assignments
CREATE POLICY "riders_update_own_assignments" ON public.delivery_assignments
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM public.delivery_partners WHERE id = rider_id
    ));

-- Merchants can view assignments for their orders
CREATE POLICY "merchants_view_store_assignments" ON public.delivery_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = delivery_assignments.store_id
            AND stores.merchant_id = auth.uid()
        )
    );

-- System can create assignments
CREATE POLICY "system_create_assignments" ON public.delivery_assignments
    FOR INSERT
    WITH CHECK (true); -- Controlled by Edge Functions

-- ══════════════════════════════════════════════════════════
--  PROMO CODES
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active promo codes
CREATE POLICY "public_view_active_promos" ON public.promo_codes
    FOR SELECT
    USING (is_active = true AND valid_until > NOW());

-- Only admins can manage promo codes
CREATE POLICY "admins_manage_promos" ON public.promo_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- ══════════════════════════════════════════════════════════
--  PROMO USAGE
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.promo_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own promo usage
CREATE POLICY "users_view_own_promo_usage" ON public.promo_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- System creates promo usage records
CREATE POLICY "system_create_promo_usage" ON public.promo_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
--  REFERRALS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "users_view_own_referrals" ON public.referrals
    FOR SELECT
    USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- Users can create referrals
CREATE POLICY "users_create_referrals" ON public.referrals
    FOR INSERT
    WITH CHECK (auth.uid() = referrer_user_id);

-- System can update referrals
CREATE POLICY "system_update_referrals" ON public.referrals
    FOR UPDATE
    USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- ══════════════════════════════════════════════════════════
--  ORDER REVIEWS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reviews
CREATE POLICY "users_manage_own_reviews" ON public.order_reviews
    FOR ALL
    USING (auth.uid() = user_id);

-- Merchants can view reviews for their stores
CREATE POLICY "merchants_view_store_reviews" ON public.order_reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = order_reviews.store_id
            AND stores.merchant_id = auth.uid()
        )
    );

-- Riders can view their reviews
CREATE POLICY "riders_view_own_reviews" ON public.order_reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.delivery_partners
            WHERE delivery_partners.id = order_reviews.rider_id
            AND delivery_partners.user_id = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════
--  NOTIFICATIONS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own notifications
CREATE POLICY "users_manage_own_notifications" ON public.notifications
    FOR ALL
    USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "system_create_notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (true); -- Controlled by Edge Functions

-- ══════════════════════════════════════════════════════════
--  PUSH TOKENS
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push tokens
CREATE POLICY "users_manage_own_tokens" ON public.push_tokens
    FOR ALL
    USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
--  SUCCESS MESSAGE
-- ══════════════════════════════════════════════════════════

SELECT 
    '✅ Phase 2 RLS Policies Created Successfully!' as status,
    'All tables are now secured with Row Level Security.' as message;
