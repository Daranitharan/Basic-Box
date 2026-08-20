# 🚀 BILLAXIS - Q-Commerce Inventory Management System

![BILLAXIS](qcommerce-inventory/assets/billaxis-logo.svg)

A modern, cloud-powered inventory and profit tracking system for Q-commerce businesses.

---

## ⚡ Quick Start

### 1. Open the App
```
http://localhost:8000/merchant.html
```

Server is already running on port 8000!

### 2. Login or Register
- Use any email/password to create an account
- Your data is saved to Supabase cloud database

### 3. Start Managing Inventory
- Add products
- Record purchases (buy)
- Record sales (sell)
- Track orders
- View reports

---

## 📁 Project Structure

```
startup-krish/
├── qcommerce-inventory/          # Main application
│   ├── css/                      # Stylesheets
│   ├── js/                       # JavaScript modules
│   ├── pages/                    # Feature pages
│   ├── assets/                   # Images & logos
│   └── merchant.html             # Dashboard
├── index.html                    # Redirects to login
├── login.html                    # Login page
├── register.html                 # Registration page
└── COPY_AND_RUN_IN_SUPABASE.sql # Database setup
```

---

## 🗄️ Database Setup

**If products aren't saving to cloud:**

### Step 1: Get Supabase Credentials
1. Go to https://supabase.com/dashboard
2. Click Settings → API
3. Copy:
   - Project URL
   - Anon public key

### Step 2: Update Config
Edit `qcommerce-inventory/js/config.js`:
```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### Step 3: Run SQL
1. Open Supabase SQL Editor
2. Copy entire `COPY_AND_RUN_IN_SUPABASE.sql` file
3. Paste and run
4. Wait for success message

**📖 Detailed guide:** See `START_HERE.md`

---

## ✨ Features

### 📦 Inventory Management
- Add/edit/delete products
- Track stock levels
- Low stock alerts
- Barcode support
- Product images (Base64)

### 💰 Purchase & Sales
- Record buy transactions
- POS-style selling interface
- Automatic profit calculation
- Cost tracking

### 📋 Orders
- Manage customer orders
- Real-time order notifications
- Status tracking (New → Preparing → Delivered)
- Payment tracking

### 📊 Reports
- Sales reports
- Profit analysis
- Stock reports
- Transaction history

### 🎨 Modern UI
- Dark/Light theme toggle
- Responsive design
- Smooth animations
- Cinematic background effects

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL)
- **Storage:** Supabase + LocalStorage fallback
- **Auth:** Supabase Auth
- **Realtime:** Supabase Realtime subscriptions

---

## 📱 Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/merchant.html` | Main overview |
| Products | `/pages/products.html` | Product management |
| Buy | `/pages/buy.html` | Record purchases |
| Sell | `/pages/sell.html` | POS interface |
| Orders | `/pages/orders.html` | Order management |
| Stock | `/pages/stock.html` | Stock adjustments |
| Reports | `/pages/reports.html` | Analytics |
| Settings | `/pages/settings.html` | User settings |

---

## 🎯 Key Files

### Essential Documentation
- **README.md** - This file
- **START_HERE.md** - Quick setup guide (3 steps)
- **FINAL_DATABASE_SETUP.md** - Complete database guide
- **SQL_FILES_REFERENCE.md** - SQL file reference

### SQL Files
- **COPY_AND_RUN_IN_SUPABASE.sql** - Database schema (run this!)
- **qcommerce-inventory/supabase-schema.sql** - Backup reference

### Configuration
- **qcommerce-inventory/js/config.js** - Supabase credentials
- **qcommerce-inventory/js/db.js** - Database layer
- **qcommerce-inventory/js/auth.js** - Authentication

---

## 🚀 Local Development

### Using Python (Current)
```bash
cd qcommerce-inventory
python -m http.server 8000
```

### Using Node.js
```bash
npx http-server qcommerce-inventory -p 8000
```

### Using PHP
```bash
cd qcommerce-inventory
php -S localhost:8000
```

Then open: http://localhost:8000/merchant.html

---

## 🔧 Configuration

### Supabase Setup
Located in `qcommerce-inventory/js/config.js`:
- Update `SUPABASE_URL`
- Update `SUPABASE_ANON_KEY`
- Save and reload

### Theme
- Toggle dark/light mode from header
- Preference saved in localStorage

---

## 📊 Database Tables

The application uses 6 main tables:

1. **users** - User accounts (syncs with Supabase Auth)
2. **products** - Product inventory
3. **purchases** - Buy transactions
4. **sales** - Sell transactions
5. **orders** - Customer orders (with realtime)
6. **stock_adjustments** - Stock changes

---

## 🔐 Security

- Row Level Security (RLS) enabled
- Users can only access their own data
- Secure authentication via Supabase
- No sensitive data in frontend code

---

## 🌟 Features Highlight

### Real-time Order Notifications
- Live updates when new orders arrive
- Sound notification (E5+G#5 harmony)
- Toast notifications
- Status badge updates

### Intelligent Stock Management
- Automatic stock updates on buy/sell
- Manual stock adjustments with reasons
- Low stock warnings
- Stock value calculation

### Profit Tracking
- Automatic profit calculation
- Per-product profit margins
- Daily/monthly profit reports
- Cost vs selling price analysis

---

## 📖 Documentation

1. **START_HERE.md** - 3-step quick start
2. **FINAL_DATABASE_SETUP.md** - Detailed setup guide
3. **SQL_FILES_REFERENCE.md** - SQL files explained
4. **QUICK_START_GUIDE.md** - General project guide

---

## 🐛 Troubleshooting

### Products not saving?
→ Check `config.js` has real Supabase credentials
→ Run `COPY_AND_RUN_IN_SUPABASE.sql` in Supabase
→ Verify you're logged in

### Console errors?
→ Press F12 to view browser console
→ Check network tab for API errors
→ Verify Supabase URL format (no `/rest/v1/`)

### Can't login?
→ Register a new account first
→ Check Supabase Authentication is enabled
→ Clear browser cache and try again

**More help:** See `FINAL_DATABASE_SETUP.md` troubleshooting section

---

## 📞 Support

**Issues with setup?**
1. Read `START_HERE.md` for quick fixes
2. Check `FINAL_DATABASE_SETUP.md` for detailed help
3. Review browser console for errors (F12)

---

## 🎉 What's Next?

After setup:
- ✅ Add your products
- ✅ Record your first purchase
- ✅ Make your first sale
- ✅ Track your profits
- ✅ Manage orders

---

## 📝 License

MIT License - Free to use and modify

---

## 🚀 Current Status

✅ **Ready for Production**
- Full inventory management
- Order tracking with realtime
- Profit analytics
- Cloud database integration
- Responsive design
- Theme support

---

**Made with ❤️ for Q-commerce businesses**

**Version:** 2.0 (BILLAXIS Rebranded)
**Last Updated:** August 2026
**Server:** Running on port 8000

**Start using:** http://localhost:8000/merchant.html
