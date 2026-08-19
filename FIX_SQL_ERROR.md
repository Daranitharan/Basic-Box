# 🔧 FIX: SQL Error "column role does not exist"

## ❌ The Error You Saw

```
Error: Failed to run sql query: ERROR: 42703: column "role" does not exist
```

## 🔍 What Caused It

The original SQL tried to add a `role` column to the `users` table, but in Supabase:
- The `auth.users` table is managed by Supabase Auth
- It's **read-only** - you can't modify its structure
- We need a separate `profiles` table instead

## ✅ The Fix

I've created a **FIXED** version of the schema that works properly with Supabase.

---

## 🚀 Quick Fix Instructions

### **Step 1: Use the Fixed SQL File**

Instead of: ~~`supabase-schema-v3-billaxis.sql`~~

**Use**: `supabase-schema-v3-billaxis-FIXED.sql`

### **Step 2: Clear Previous Attempt (if needed)**

If you already tried running the old SQL, you might need to clean up:

1. In Supabase Dashboard, go to **SQL Editor**
2. Run this cleanup query:

```sql
-- Clean up any partial changes (safe to run)
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.product_batches CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

### **Step 3: Run the Fixed Migration**

1. In Supabase Dashboard, click **SQL Editor**
2. Click **"New query"**
3. Open file: `supabase-schema-v3-billaxis-FIXED.sql`
4. Copy **ALL contents** (Ctrl+A, Ctrl+C)
5. Paste in SQL Editor (Ctrl+V)
6. Click **"Run"** (Ctrl+Enter)
7. ⏳ Wait 10-20 seconds
8. Should see: **"BILLAXIS Database Setup Complete! 🎉"**

### **Step 4: Verify Tables Created**

1. Click **Table Editor** (left sidebar)
2. You should see these tables:
   ```
   ✓ profiles (NEW - stores user roles)
   ✓ users
   ✓ products
   ✓ orders
   ✓ purchases
   ✓ sales
   ✓ customers
   ✓ stores
   ✓ product_batches
   ✓ notifications
   ```

---

## 🆕 What's Different in the Fixed Version

### Original (Broken):
```sql
-- ❌ Tries to modify auth.users (not allowed)
ALTER TABLE public.users ADD COLUMN role TEXT;
```

### Fixed Version:
```sql
-- ✅ Creates separate profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role TEXT DEFAULT 'merchant',
    ...
);
```

---

## 📊 Database Structure After Fix

```
Supabase Auth
    └── auth.users (managed by Supabase, read-only)
            ↓
Your Tables
    ├── profiles (user roles & settings)
    ├── products (your inventory)
    ├── orders (customer orders)
    ├── purchases (stock purchases)
    ├── sales (POS sales)
    ├── customers (customer database)
    ├── stores (merchant stores)
    ├── product_batches (expiry tracking)
    └── notifications (in-app notifications)
```

---

## ✅ After Running Fixed SQL

### Test Your Setup:

1. **Reload your app** (F5)
2. **Check console** (F12) - should see:
   ```
   ✅ Supabase configured
   ```
3. **Register/Login** as a merchant
4. **Add a product**
5. **Check Supabase** → Table Editor → products table
6. **See your product!** 🎉

---

## 🔍 Troubleshooting

### Still Getting Errors?

**Error: "relation already exists"**
- **Solution**: Run the cleanup SQL from Step 2, then try again

**Error: "permission denied"**
- **Solution**: Make sure you're using the **SQL Editor**, not Table Editor

**Error: "invalid input syntax"**
- **Solution**: Make sure you copied the **entire** SQL file (scroll to bottom)

### Products Still Not Saving?

1. **Check config.js** - Make sure you have YOUR credentials (not placeholders)
2. **Reload app** - Press F5 after updating config
3. **Clear cache** - Try in incognito mode
4. **Check console** - Press F12 and look for errors

---

## 📁 Files

- ✅ **`supabase-schema-v3-billaxis-FIXED.sql`** - Use this one!
- ❌ ~~`supabase-schema-v3-billaxis.sql`~~ - Don't use (has errors)

---

## 🎯 Summary

| Issue | Solution |
|-------|----------|
| ❌ SQL error: "column role does not exist" | ✅ Use FIXED SQL file |
| ❌ Can't modify auth.users table | ✅ Created separate profiles table |
| ❌ Products not saving | ✅ Run fixed SQL + update config.js |

---

## 📚 Complete Setup Steps

1. ✅ Create Supabase project
2. ✅ Get credentials (URL + Key)
3. ✅ Update config.js
4. ✅ Run **FIXED** SQL migration ← **This fixes the error**
5. ✅ Reload app
6. ✅ Test by adding product

---

## 🆘 Need More Help?

### Check These Files:
1. **`SETUP_DATABASE_NOW.md`** - Complete setup guide
2. **`WHERE_IS_MY_DATA.md`** - Understanding data storage
3. **`DATABASE_OVERVIEW.md`** - Database architecture

### Quick Commands to Verify:

**Check if Supabase is configured:**
```javascript
// In browser console (F12)
console.log('Configured?', supabaseConfigured());
```

**Check for errors:**
- Press F12 → Console tab
- Look for red error messages
- Share them if you need help

---

**File to use**: `supabase-schema-v3-billaxis-FIXED.sql`  
**Status**: ✅ Fixed and ready to use  
**Result**: Products will save to database properly

---

**Run the FIXED SQL file and you're good to go!** 🚀
