# 🚀 Quick Test Guide: Live/Offline Toggle

## ⚡ 3-Step Quick Start

### Step 1: Run SQL (2 minutes)
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project → SQL Editor
3. Copy & paste contents of `PHASE_2_STEP_1_LIVE_TOGGLE.sql`
4. Click **Run**
5. You should see: "✅ Live/Offline Toggle Schema Created!"

### Step 2: Open Merchant Dashboard (1 minute)
1. Open `qcommerce-inventory/merchant.html` in your browser
2. Login with your merchant account
3. Look at the sidebar (below "Billaxis" logo)

### Step 3: Test Toggle (1 minute)
1. Click the toggle switch
2. Watch it animate and change color
3. See the toast notification appear
4. Refresh the page → toggle state persists! ✅

---

## 🎯 What You Should See

### In the Sidebar:
```
┌─────────────────────────┐
│   🔸 Billaxis           │
│   Merchant Dashboard    │
├─────────────────────────┤
│                         │
│ Live          [●━━━━━] │ ← This is NEW!
│ Accepting new orders    │
│                         │
├─────────────────────────┤
│ 📊 Dashboard            │
│ 🛒 Orders               │
│ 📦 Products             │
│ ...                     │
└─────────────────────────┘
```

### When You Click:
- Toggle slides smoothly
- Text changes: "Live" ↔ "Offline"
- Background color changes: Green ↔ Gray
- Toast notification pops up

---

## ✅ Success Indicators

- [ ] Toggle appears on all merchant pages
- [ ] Toggle switches smoothly
- [ ] Status text updates
- [ ] Background changes color
- [ ] Toast notification shows
- [ ] State persists after refresh

---

## 🐛 Troubleshooting

### Toggle doesn't appear?
- Check browser console (F12) for errors
- Verify you're logged in as a merchant
- Make sure SQL was run successfully

### Toggle doesn't save state?
- Check Supabase connection in browser console
- Verify `config.js` has correct credentials
- Run the SQL migration if you haven't

### No toast notification?
- Check if `toast.js` is loaded
- Look in browser console for errors

---

## 🎉 Next: Test Real-time Sync!

1. Open merchant dashboard in **two browser tabs**
2. Toggle status in **Tab 1**
3. Watch **Tab 2** update automatically!

This proves the real-time sync is working across devices.

---

*That's it! Your Live/Offline toggle is ready to use! 🎊*
