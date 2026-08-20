# 📁 BILLAXIS - Project Files Guide

## 🎯 Essential Files (Root Directory)

### 🚀 **Quick Start Files**
```
START_HERE.md                    ← Read this FIRST (3-step setup)
README.md                        ← Project overview & features
```

### 📖 **Documentation**
```
FINAL_DATABASE_SETUP.md          ← Complete database setup guide
SQL_FILES_REFERENCE.md           ← SQL files explained
QUICK_START_GUIDE.md             ← General project quick start
```

### 🗄️ **Database Setup**
```
COPY_AND_RUN_IN_SUPABASE.sql    ← Run this in Supabase SQL Editor
```

### 🌐 **Entry Points**
```
index.html                       ← Auto-redirects to login
login.html                       ← Login page
register.html                    ← Registration page
```

---

## 📂 Application Directory Structure

```
qcommerce-inventory/
│
├── 🎨 css/
│   ├── variables.css            ← Theme colors & variables
│   ├── components.css           ← Reusable UI components
│   └── style.css                ← Main stylesheet
│
├── 📜 js/
│   ├── config.js                ← ⚙️ Supabase credentials (EDIT THIS!)
│   ├── auth.js                  ← Authentication logic
│   ├── db.js                    ← Database layer
│   ├── storage.js               ← LocalStorage wrapper
│   ├── theme.js                 ← Dark/light theme toggle
│   ├── toast.js                 ← Notification toasts
│   ├── cinematic-bg.js          ← Animated background
│   ├── custom-dropdown.js       ← Dropdown menus
│   ├── app.js                   ← Dashboard logic
│   ├── products.js              ← Product management
│   ├── buy.js                   ← Purchase recording
│   ├── sell.js                  ← POS/selling interface
│   ├── orders.js                ← Order management
│   ├── realtime-orders.js       ← Real-time notifications
│   ├── stock.js                 ← Stock adjustments
│   ├── inventory.js             ← Inventory page
│   ├── transactions.js          ← Transaction history
│   └── reports.js               ← Reports & analytics
│
├── 📄 pages/
│   ├── products.html            ← Product management page
│   ├── buy.html                 ← Purchase recording page
│   ├── sell.html                ← POS/selling page
│   ├── orders.html              ← Order management page
│   ├── stock.html               ← Stock adjustment page
│   ├── inventory.html           ← Inventory view page
│   ├── reports.html             ← Reports & analytics page
│   ├── customers.html           ← Customer management
│   ├── notifications.html       ← Notifications center
│   └── settings.html            ← User settings
│
├── 🎨 assets/
│   ├── billaxis-logo.svg        ← Main logo
│   ├── billaxis-icon.svg        ← Icon/favicon
│   └── icons/                   ← Additional icons
│
├── 🗄️ Database Files
│   └── supabase-schema.sql      ← Backup SQL schema
│
└── 🏠 Main Pages
    └── merchant.html            ← Main dashboard
```

---

## 🎯 File Purpose Quick Reference

### Must Read (Start Here)
| File | Purpose | When to Read |
|------|---------|--------------|
| `START_HERE.md` | 3-step setup guide | **Read FIRST** |
| `README.md` | Project overview | For understanding |
| `FINAL_DATABASE_SETUP.md` | Database setup | When setting up |

### Configuration
| File | Purpose | Action Needed |
|------|---------|---------------|
| `qcommerce-inventory/js/config.js` | Supabase credentials | **EDIT THIS** |
| `COPY_AND_RUN_IN_SUPABASE.sql` | Database schema | **RUN IN SUPABASE** |

### Application Entry
| File | Purpose | URL |
|------|---------|-----|
| `index.html` | Auto-redirect | http://localhost:8000/ |
| `login.html` | Login page | http://localhost:8000/login.html |
| `register.html` | Registration | http://localhost:8000/register.html |
| `qcommerce-inventory/merchant.html` | Dashboard | http://localhost:8000/qcommerce-inventory/merchant.html |

---

## 🔧 Files You Need to Edit

### 1. **config.js** (REQUIRED)
**Location:** `qcommerce-inventory/js/config.js`

**What to change:**
```javascript
const SUPABASE_URL = 'YOUR-PROJECT-URL';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

**When:** Before first use

---

## 📊 Database Tables Created

When you run `COPY_AND_RUN_IN_SUPABASE.sql`, these tables are created:

1. **users** - User accounts
2. **products** - Product inventory
3. **purchases** - Purchase records
4. **sales** - Sales records
5. **orders** - Customer orders
6. **stock_adjustments** - Stock changes

---

## 🎨 Theme & Styling

### CSS Files
- **variables.css** - Colors, spacing, typography
- **components.css** - Buttons, cards, forms, tables
- **style.css** - Layout, pages, responsive design

### Theme Toggle
Located in header → Dark/Light mode switch

---

## 🚀 How to Run

### Current Setup (Python Server Running)
```
✅ Server is running on port 8000
✅ Access: http://localhost:8000/qcommerce-inventory/merchant.html
```

### Manual Start
```bash
cd qcommerce-inventory
python -m http.server 8000
```

---

## 📝 Documentation Hierarchy

```
1. START_HERE.md (Quick 3-step guide)
   ↓
2. README.md (Overview & features)
   ↓
3. FINAL_DATABASE_SETUP.md (Detailed setup)
   ↓
4. SQL_FILES_REFERENCE.md (SQL reference)
   ↓
5. QUICK_START_GUIDE.md (General guide)
```

---

## 🗑️ Removed Files (Cleanup)

We removed these redundant files:
- ❌ Multiple setup guides (kept best ones)
- ❌ Historical progress reports
- ❌ Duplicate documentation
- ❌ Git operation summaries
- ❌ Session notes
- ❌ Leftover code snippets

**Result:** Clean, focused project structure!

---

## 📦 What's in Each Folder

### `/qcommerce-inventory/css/` (3 files)
Styling for the entire application

### `/qcommerce-inventory/js/` (18 files)
All application logic and features

### `/qcommerce-inventory/pages/` (10 files)
Individual feature pages

### `/qcommerce-inventory/assets/` (3 items)
Logos, icons, images

### Root directory (9 files)
Documentation, setup files, entry pages

---

## 🎯 Quick Actions

### To Start Development
1. Edit `qcommerce-inventory/js/config.js`
2. Run `COPY_AND_RUN_IN_SUPABASE.sql`
3. Open http://localhost:8000/qcommerce-inventory/merchant.html

### To Add Features
- Edit files in `qcommerce-inventory/js/`
- Modify pages in `qcommerce-inventory/pages/`
- Update styles in `qcommerce-inventory/css/`

### To Deploy
1. Upload `qcommerce-inventory/` folder to web host
2. Update `config.js` with production Supabase URL
3. Test all features

---

## 📊 File Count Summary

```
Root directory:        9 files
  ├── Documentation:   5 files
  ├── SQL:             1 file
  └── HTML:            3 files

qcommerce-inventory/:
  ├── CSS:             3 files
  ├── JavaScript:     18 files
  ├── Pages:          10 files
  ├── Assets:          3 files
  └── Schema:          1 file

Total:              ~45 files (clean & organized!)
```

---

## ✅ What You Have Now

- ✅ Clean project structure
- ✅ No duplicate files
- ✅ Essential documentation only
- ✅ Clear file organization
- ✅ Easy to navigate
- ✅ Production-ready

---

**Everything is organized and ready to use! 🚀**

**Start here:** `START_HERE.md`
**Current server:** http://localhost:8000
