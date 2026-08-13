// ============================================================
//  config.js  –  Supabase configuration for Basics Box
//
//  HOW TO SETUP:
//  1. Go to https://supabase.com and create a free account
//  2. Create a new project (name it "basics-box" or anything)
//  3. After the project is ready, go to:
//       Settings → API
//  4. Copy your "Project URL" → paste into SUPABASE_URL below
//  5. Copy your "anon public" key → paste into SUPABASE_ANON_KEY below
//  6. Run the SQL in supabase-schema.sql in the Supabase SQL Editor
// ============================================================

const SUPABASE_URL  = 'https://wjvigirpkriekyubqidj.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmlnaXJwa3JpZWt5dWJxaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDIwODUsImV4cCI6MjEwMTkxODA4NX0.C0lBEAglS_61BaKxjtcviMAPK6IWtaNQi4fd9EInL3c';

// ── Internal check ──────────────────────────────────────────
// Returns true only when real credentials have been filled in.
function supabaseConfigured() {
    return (
        SUPABASE_URL  !== 'https://wjvigirpkriekyubqidj.supabase.co/rest/v1/' &&
        SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdmlnaXJwa3JpZWt5dWJxaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDIwODUsImV4cCI6MjEwMTkxODA4NX0.C0lBEAglS_61BaKxjtcviMAPK6IWtaNQi4fd9EInL3c' &&
        SUPABASE_URL.startsWith('https://') &&
        SUPABASE_ANON_KEY.length > 20
    );
}
