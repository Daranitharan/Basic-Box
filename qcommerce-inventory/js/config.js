// ============================================================
//  config.js  –  Supabase configuration for BILLAXIS
//
//  ⚠️ IMPORTANT: Replace with YOUR actual Supabase credentials!
//  
//  HOW TO SETUP:
//  1. Go to https://supabase.com and create a free account
//  2. Create a new project (name it "billaxis" or anything)
//  3. After the project is ready, go to:
//       Settings → API
//  4. Copy your "Project URL" → paste into SUPABASE_URL below
//  5. Copy your "anon public" key → paste into SUPABASE_ANON_KEY below
//  6. Run the SQL in supabase-schema-v3-billaxis.sql in the Supabase SQL Editor
//
//  ⚠️ NOTE: Remove "/rest/v1/" from the URL - use just the base URL
// ============================================================

// 🔴 REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS 🔴
const SUPABASE_URL  = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';

// ── Internal check ──────────────────────────────────────────
// Returns true only when real credentials have been filled in.
function supabaseConfigured() {
    return (
        SUPABASE_URL !== 'https://YOUR-PROJECT-ID.supabase.co' &&
        SUPABASE_ANON_KEY !== 'YOUR_ANON_PUBLIC_KEY_HERE' &&
        SUPABASE_URL.startsWith('https://') &&
        SUPABASE_ANON_KEY.length > 20
    );
}
