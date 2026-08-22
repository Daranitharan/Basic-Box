-- ============================================================
--  PHASE 2 - STEP 1: Live/Offline Toggle Feature
--  Add merchant availability status tracking
-- ============================================================

-- Add is_accepting_orders field to users table (for merchants)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN DEFAULT true;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW();

-- Update existing merchants to accepting orders by default
UPDATE public.users 
SET is_accepting_orders = true 
WHERE user_type = 'merchant' OR id IN (
    SELECT DISTINCT user_id FROM public.products
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_accepting_orders 
ON public.users(is_accepting_orders) 
WHERE is_accepting_orders = true;

-- Success message
SELECT 
    '✅ Live/Offline Toggle Schema Created!' as status,
    'Merchants can now control order acceptance' as message;
