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
    // Check each condition individually for debugging
    const hasURL = !!SUPABASE_URL;
    const hasKey = !!SUPABASE_ANON_KEY;
    const validHTTPS = SUPABASE_URL && SUPABASE_URL.startsWith('https://');
    const hasSupabase = SUPABASE_URL && SUPABASE_URL.includes('supabase.co');
    const keyLongEnough = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 100;
    const notPlaceholderURL = SUPABASE_URL && !SUPABASE_URL.includes('YOUR-PROJECT');
    const notPlaceholderKey = SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_ANON');
    
    const isConfigured = hasURL && hasKey && validHTTPS && hasSupabase && keyLongEnough && notPlaceholderURL && notPlaceholderKey;
    
    // Detailed debug logging
    console.log('🔍 Supabase Configuration Debug:');
    console.log('   URL:', SUPABASE_URL);
    console.log('   Key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0, 'characters');
    console.log('   ✓ Has URL:', hasURL);
    console.log('   ✓ Has Key:', hasKey);
    console.log('   ✓ Valid HTTPS:', validHTTPS);
    console.log('   ✓ Has supabase.co:', hasSupabase);
    console.log('   ✓ Key length > 100:', keyLongEnough);
    console.log('   ✓ Not placeholder URL:', notPlaceholderURL);
    console.log('   ✓ Not placeholder Key:', notPlaceholderKey);
    console.log('   📊 RESULT:', isConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');
    
    return isConfigured;
}
