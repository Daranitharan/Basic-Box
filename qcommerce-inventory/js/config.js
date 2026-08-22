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
const SUPABASE_URL  = 'https://wjvigirpkriekyubqidj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmlnaXJwa3JpZWt5dWJxaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDIwODUsImV4cCI6MjEwMTkxODA4NX0.C0lBEAglS_61BaKxjtcviMAPK6IWtaNQi4fd9EInL3c';

// ── Internal check ──────────────────────────────────────────
// Returns true only when real credentials have been filled in.
function supabaseConfigured() {
    return (
        SUPABASE_URL !== 'https://wjvigirpkriekyubqidj.supabase.co' &&
        SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmlnaXJwa3JpZWt5dWJxaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDIwODUsImV4cCI6MjEwMTkxODA4NX0.C0lBEAglS_61BaKxjtcviMAPK6IWtaNQi4fd9EInL3c' &&
        SUPABASE_URL.startsWith('https://') &&
        SUPABASE_ANON_KEY.length > 20
    );
}
