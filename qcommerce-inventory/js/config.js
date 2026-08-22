// ============================================================
//  config.js  –  Supabase configuration for BILLAXIS
//
//  ✅ Your Supabase credentials are configured!
//  Project: wjvigirpkriekyubqidj
//
//  If you need to change credentials:
//  1. Go to https://supabase.com/dashboard
//  2. Go to Settings → API
//  3. Copy your "Project URL" → paste into SUPABASE_URL below
//  4. Copy your "anon public" key → paste into SUPABASE_ANON_KEY below
//  5. Make sure SQL tables are created (run COPY_AND_RUN_IN_SUPABASE.sql)
//
//  ⚠️ NOTE: URL should NOT have "/rest/v1/" at the end
// ============================================================

// ✅ Supabase Credentials (Currently Configured)
const SUPABASE_URL  = 'https://wjvigirpkriekyubqidj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmlnaXJwa3JpZWt5dWJxaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDIwODUsImV4cCI6MjEwMTkxODA4NX0.C0lBEAglS_61BaKxjtcviMAPK6IWtaNQi4fd9EInL3c';

// ── Internal check ──────────────────────────────────────────
// Returns true when Supabase credentials are valid
function supabaseConfigured() {
    // Check if URL and key are valid (not empty/placeholder)
    return (
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        SUPABASE_URL.startsWith('https://') &&
        SUPABASE_URL.includes('supabase.co') &&
        SUPABASE_ANON_KEY.length > 100 &&
        !SUPABASE_URL.includes('YOUR-PROJECT') &&
        !SUPABASE_ANON_KEY.includes('YOUR_ANON')
    );
}
