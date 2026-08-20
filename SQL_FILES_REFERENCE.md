# 📁 SQL Files Reference - Quick Guide

## ✅ Files You Have (2 files)

### 1. **`COPY_AND_RUN_IN_SUPABASE.sql`** 
**⭐ USE THIS ONE ⭐**

**What it is:**
- Complete, consolidated SQL file
- Has EVERYTHING you need
- Includes cleanup + full schema
- Step-by-step instructions in comments

**Tables it creates:**
- users
- products
- purchases
- sales
- orders
- stock_adjustments

**Features:**
- ✅ Row Level Security (RLS)
- ✅ Auto-create user profiles
- ✅ Auto-update timestamps
- ✅ Realtime for orders
- ✅ Clean + tested

**How to use:**
1. Copy entire file contents
2. Paste in Supabase SQL Editor
3. Click "Run"
4. Done!

**When to use:**
- ✅ Right now (for setup)
- ✅ Fresh database setup
- ✅ Resetting database
- ✅ Production deployment

**Status:** ✅ Ready to use

---

### 2. **`qcommerce-inventory/supabase-schema.sql`**
**📚 BACKUP REFERENCE 📚**

**What it is:**
- Original schema file
- Same tables as COPY_AND_RUN_IN_SUPABASE.sql
- Kept as backup reference
- Has same functionality

**When to use:**
- 📖 Reference only
- 🔍 Compare with COPY_AND_RUN file
- 🛟 Fallback if main file has issues

**Difference from COPY_AND_RUN:**
- Same content, just formatted differently
- COPY_AND_RUN has better comments
- COPY_AND_RUN has step-by-step guide

**Status:** ✅ Keep for reference (don't delete)

---

## 🗑️ Files We Deleted (Cleaned Up)

### ❌ `supabase-schema-v3-billaxis-FIXED.sql`
**Why deleted:**
- Had merchant_id column errors
- Too complex for current needs
- Doesn't match current app code
- Caused confusion

### ❌ `supabase-schema-SIMPLE.sql`
**Why deleted:**
- Missing stock_adjustments table
- Too minimal
- Not needed since original works

### ❌ `supabase-schema-v3-billaxis.sql`
**Why deleted:**
- Tried to modify auth.users table (read-only)
- Had errors
- Replaced by FIXED version
- FIXED version also deleted

---

## 🎯 Which File to Use?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  USE: COPY_AND_RUN_IN_SUPABASE.sql                │
│                                                     │
│  This is your ONE file for everything!             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 File Comparison

| Feature | COPY_AND_RUN | supabase-schema.sql |
|---------|--------------|---------------------|
| **Tables** | 6 core tables | Same 6 tables |
| **RLS** | ✅ Yes | ✅ Yes |
| **Triggers** | ✅ Yes | ✅ Yes |
| **Realtime** | ✅ Yes | ✅ Yes |
| **Comments** | ✅ Detailed | ✅ Basic |
| **Steps** | ✅ Numbered | ❌ No |
| **Cleanup** | ✅ Included | ✅ Included |
| **Status** | ⭐ Main file | 📚 Reference |

---

## 🚀 Quick Setup

**To setup your database:**

1. Open: `COPY_AND_RUN_IN_SUPABASE.sql`
2. Copy: Entire file (Ctrl+A, Ctrl+C)
3. Go to: Supabase Dashboard → SQL Editor
4. Paste: (Ctrl+V)
5. Run: Click "Run" button
6. Wait: 10-30 seconds
7. Done: ✅ Database ready!

---

## 📋 What Gets Created

### Tables (6):
```sql
1. users              -- User accounts (syncs with auth)
2. products           -- Inventory management
3. purchases          -- Buy transactions  
4. sales              -- Sell transactions
5. orders             -- Customer orders
6. stock_adjustments  -- Stock changes
```

### Security:
```sql
- Row Level Security enabled
- Users only see their own data
- Auto-policies for all tables
```

### Automation:
```sql
- Auto-create user profile on signup
- Auto-update timestamps on products
- Realtime subscriptions for orders
```

---

## 🔧 SQL File Contents

### STEP 1: Cleanup (Optional)
Drops existing tables for fresh start

### STEP 2: Create Tables
All 6 tables with proper relationships

### STEP 3: Enable RLS
Security layer activated

### STEP 4: Create Policies
Users can only access their own data

### STEP 5: Functions & Triggers
Auto-update timestamps, auto-create profiles

### STEP 6: Enable Realtime
Live updates for orders table

---

## ✅ After Running SQL

You will have:
- ✅ 6 database tables ready
- ✅ Security policies active
- ✅ Auto-profile creation working
- ✅ Realtime orders enabled
- ✅ Triggers for timestamps
- ✅ Foreign key relationships

---

## 🎯 Remember

**Main file:** `COPY_AND_RUN_IN_SUPABASE.sql`  
**Backup:** `qcommerce-inventory/supabase-schema.sql`  
**Status:** Only 2 files (cleaned up!)  
**Action:** Run COPY_AND_RUN file in Supabase

**You only need to run this ONCE!**

---

## 📞 Quick Checks

### Before running SQL:
- [ ] Supabase project exists
- [ ] Logged into Supabase dashboard
- [ ] SQL Editor open
- [ ] File copied to clipboard

### After running SQL:
- [ ] Success message appeared
- [ ] Table Editor shows 6 tables
- [ ] No error messages
- [ ] Ready to update config.js

---

## 🎉 That's It!

**Simple setup:**
1. One SQL file to run
2. Creates everything you need
3. Takes 30 seconds
4. Done!

**The COPY_AND_RUN_IN_SUPABASE.sql file is your complete database setup!**

---

**File location:** `d:\startup-krish\COPY_AND_RUN_IN_SUPABASE.sql`  
**Open in:** Supabase SQL Editor  
**Run once:** ✅ That's all!
