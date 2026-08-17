# Testing Checklist for Orders Migration

## ✅ Pre-Testing Setup

### Supabase Configuration
- [ ] Verify `js/config.js` has correct Supabase URL and Anon Key
- [ ] Run SQL schema from `supabase-schema.sql` in Supabase SQL Editor
- [ ] Enable email confirmations in Supabase Dashboard → Authentication → Settings
- [ ] Configure email templates (optional but recommended)

### Local Setup
- [ ] Open `merchant.html` in a modern browser (Chrome, Firefox, Edge)
- [ ] Open browser DevTools (F12) to monitor console for errors
- [ ] Clear localStorage if testing with fresh data: `localStorage.clear()` in console

---

## 🧪 Test Scenarios

### 1. Authentication & Registration

#### New User Registration (Supabase)
- [ ] Navigate to `register.html`
- [ ] Fill in: Name, Email, Password (6+ characters)
- [ ] Click "Register"
- [ ] **Expected:** Confirmation page appears with "Check your email" message
- [ ] **Expected:** No auto-login happens
- [ ] Check email inbox for confirmation link
- [ ] Click confirmation link in email
- [ ] **Expected:** Redirected to `login.html`
- [ ] Login with confirmed credentials
- [ ] **Expected:** Successful login → redirected to `merchant.html`

#### LocalStorage Fallback (if Supabase not configured)
- [ ] Register with new email
- [ ] **Expected:** Immediate login + redirect to merchant page
- [ ] **Expected:** No email confirmation required

---

### 2. Dashboard Page (`merchant.html`)

#### Stats Cards
- [ ] Verify "Total Sales" shows ₹0.00 initially
- [ ] Verify "Stock Value" calculates correctly
- [ ] Verify "Total Products" shows product count
- [ ] Verify "Total Orders" shows completed orders count

#### Profit Highlight Section
- [ ] Verify "Total Profit Earned" shows ₹0.00 initially
- [ ] Verify "Today's Profit" shows ₹0.00 initially
- [ ] Verify "Profit Margin" shows 0% initially

#### Sales Chart
- [ ] Verify chart renders without errors
- [ ] Select different months from dropdown
- [ ] **Expected:** Chart updates to show selected month data
- [ ] Toggle between Light/Dark mode
- [ ] **Expected:** Chart colors update immediately (no invisible chart bug)
- [ ] **Expected:** Grid lines, text, and tooltip visible in both modes

#### Low Stock Alerts
- [ ] Add products with `minStock` values
- [ ] Reduce stock below minimum
- [ ] **Expected:** Product appears in Low Stock Alerts section
- [ ] **Expected:** Count badge shows correct number

#### Recent Transactions
- [ ] **Expected:** Shows "No transactions today" initially
- [ ] After creating orders, verify transactions appear
- [ ] **Expected:** Shows order type (Online/Offline badge)
- [ ] **Expected:** Shows profit for completed orders only

#### Manual Refresh
- [ ] Click refresh button (🔄 icon)
- [ ] **Expected:** Button spins while refreshing
- [ ] **Expected:** Toast notification "Dashboard refreshed!"
- [ ] **Expected:** All stats update

---

### 3. Orders Page (`pages/orders.html`)

#### Create Offline Order
- [ ] Click "New Order" button
- [ ] **Expected:** Modal opens with "Order Type" toggle at top
- [ ] **Expected:** "Offline" selected by default
- [ ] **Expected:** Delivery address + delivery fee fields hidden
- [ ] Fill in customer name and phone
- [ ] Select product from dropdown
- [ ] **Expected:** Dropdown shows "Product Name — ₹X.XX cost (YY unit)"
- [ ] Enter quantity and selling price
- [ ] Click "Add" button
- [ ] **Expected:** Item appears in items list showing:
  - Product name
  - "Cost: ₹X.XX | Qty: YY unit"
  - Total price (₹)
  - **Profit in green/red** (selling - cost × qty)
- [ ] Add multiple items
- [ ] Verify summary shows:
  - Subtotal
  - Delivery Fee: ₹0.00 (for offline)
  - Est. Profit (green if positive, red if negative)
  - Total
- [ ] Select payment method (Cash/UPI/Card/Online)
- [ ] Select payment status (Pending/Paid)
- [ ] Click "Place Order"
- [ ] **Expected:** Order appears in table with:
  - Order ID (#1001, #1002, etc.)
  - "Offline" badge with store icon
  - Customer name + phone
  - Items list with prices
  - Total amount
  - Profit column shows "—" (not completed yet)
  - Status "New" badge (blue)
  - Payment status badge
  - Action buttons: "Next →" and "Cancel"

#### Create Online Order
- [ ] Click "New Order"
- [ ] Toggle "Online" radio button
- [ ] **Expected:** Delivery address textarea appears
- [ ] **Expected:** Delivery Fee input appears
- [ ] Fill in customer name, phone, and address
- [ ] Enter delivery fee (e.g., 50)
- [ ] Add products (same as offline)
- [ ] **Expected:** Summary shows delivery fee added to subtotal
- [ ] **Expected:** Profit calculation excludes delivery fee
- [ ] Place order
- [ ] **Expected:** Order appears with "Online" badge (globe icon)

#### Order Status Flow
- [ ] Click on an order row
- [ ] **Expected:** Detail panel slides in from right
- [ ] **Expected:** Shows order info:
  - Order ID and status badge
  - Order type badge (Online/Offline)
  - Customer + phone + address (if online)
  - Items list with cost/sell prices and profit per item
  - Delivery fee (if online)
  - Total profit (if completed)
  - Payment method and status
  - Status timeline with progress indicators
- [ ] Click "Next →" (Preparing)
- [ ] **Expected:** Status changes to "Preparing" (orange)
- [ ] **Expected:** Timeline updates
- [ ] Continue clicking "Next →" through:
  - Ready (purple)
  - Out for Delivery (blue)
  - Completed (green)
- [ ] On "Completed" status:
  - [ ] **Expected:** Confirmation dialog appears: "Complete order #XXXX? Stock will be deducted..."
  - [ ] Click "Confirm"
  - [ ] **Expected:** Stock deducted from products
  - [ ] **Expected:** Profit column in table shows calculated profit
  - [ ] **Expected:** Order can no longer be edited
  - [ ] **Expected:** "Next" button disappears

#### Order Cancellation
- [ ] Click "Cancel" button on a non-completed order
- [ ] **Expected:** Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] **Expected:** Status changes to "Cancelled" (red)
- [ ] **Expected:** Timeline updated
- [ ] **Expected:** Cannot advance status anymore

#### Payment Status
- [ ] Click "Mark as Paid" in detail panel
- [ ] **Expected:** Payment status badge changes to "Paid" (green)
- [ ] **Expected:** Table updates

#### Stats Cards (Orders Page)
- [ ] **Expected:** "All Orders" shows total count
- [ ] **Expected:** "New" / "Preparing" / "Completed" show filtered counts
- [ ] **Expected:** "Total Revenue" shows sum of completed orders
- [ ] **Expected:** "Total Profit" shows sum of profits from completed orders
- [ ] Click on a stat card (e.g., "New")
- [ ] **Expected:** Table filters to show only orders with that status

#### Filters
- [ ] Type in search box (order ID, customer name, phone)
- [ ] **Expected:** Table filters in real-time
- [ ] Select status filter dropdown (e.g., "Completed")
- [ ] **Expected:** Table shows only completed orders
- [ ] Select a date from date filter
- [ ] **Expected:** Table shows only orders from that date
- [ ] Clear filters
- [ ] **Expected:** All orders visible again

---

### 4. Dashboard Integration After Order Completion

After completing at least one order:

- [ ] Navigate to Dashboard (`merchant.html`)
- [ ] **Expected:** "Total Sales" shows sum of completed order totals
- [ ] **Expected:** "Total Orders" shows count of completed orders
- [ ] **Expected:** "Total Profit" shows sum of profits
- [ ] **Expected:** Sales chart shows data points on completion day
- [ ] **Expected:** Chart shows both Sales (orange) and Profit (green) lines
- [ ] **Expected:** Recent Transactions shows the completed order
- [ ] **Expected:** Transaction shows:
  - "Order #XXXX — Customer Name"
  - "Completed" badge
  - Total amount
  - Profit in green/red
  - Time

---

### 5. Reports Page Integration

- [ ] Navigate to Reports page (`pages/reports.html`)
- [ ] **Expected:** Sales table shows transactions from completed orders
- [ ] **Expected:** Each row shows:
  - Date
  - Product Name
  - SKU
  - Quantity
  - Selling Price
  - Total Amount
  - Cost Price
  - **Profit column** (calculated)
- [ ] **Expected:** Sales report stats show correct totals
- [ ] Filter by date range
- [ ] **Expected:** Only sales within range shown
- [ ] **Expected:** Profit calculations accurate

---

### 6. Inventory Page Integration

- [ ] Navigate to Inventory page (`pages/inventory.html`)
- [ ] Click "Movement" tab
- [ ] **Expected:** Shows:
  - "Restocked" entries (from buy.html purchases) with green arrow up icon
  - **"Sold: Product Name (Order #XXXX)"** entries from completed orders with red arrow down icon
- [ ] **Expected:** Sold entries show:
  - Product name
  - Order ID
  - Customer name
  - Quantity sold (negative value, e.g., -5)
  - Selling price per unit
  - Time

---

### 7. Customers Page Integration

- [ ] Navigate to Customers page (`pages/customers.html`)
- [ ] **Expected:** Customer profiles built from orders
- [ ] **Expected:** Shows:
  - Customer name
  - Phone number (if provided)
  - Total Spent (sum of **completed orders only**)
  - Order Count (all orders, not just completed)
  - Last Order date
- [ ] Click on a customer
- [ ] **Expected:** Shows order history for that customer
- [ ] **Expected:** Revenue only counts completed orders

---

### 8. Stock Page (`pages/stock.html`)

- [ ] Navigate to Stock page
- [ ] **Expected:** "Stock Out" card removed
- [ ] **Expected:** Only shows "Stock In" (restock via buy.html)
- [ ] Click "Stock In"
- [ ] **Expected:** Redirects to buy page for restocking

---

### 9. Products Page

#### Purchase Price Tracking
- [ ] Navigate to Products page (`pages/products.html`)
- [ ] Add a new product
- [ ] Navigate to Buy/Restock page (`pages/buy.html`)
- [ ] Purchase the product at a specific cost price (e.g., ₹100)
- [ ] Navigate to Orders page
- [ ] Create new order
- [ ] Select the product from dropdown
- [ ] **Expected:** Dropdown shows "Product Name — ₹100.00 cost (X stock)"
- [ ] Sell at higher price (e.g., ₹150)
- [ ] **Expected:** Item row shows profit: +₹50.00 (green)
- [ ] Complete the order
- [ ] **Expected:** Order profit column shows +₹50.00

---

### 10. Theme Switching (Dark/Light Mode)

- [ ] Toggle theme button in header
- [ ] **Expected:** All pages switch theme instantly
- [ ] **Expected:** Dashboard chart re-renders with correct colors
- [ ] **Expected:** No invisible chart elements
- [ ] **Expected:** All text, borders, backgrounds visible in both modes

---

### 11. Stock Deduction Verification

- [ ] Note current stock level of a product (e.g., 100 units)
- [ ] Create order with 10 units of that product
- [ ] **Expected:** Order status "New" — stock NOT deducted yet
- [ ] Advance order to "Preparing"
- [ ] **Expected:** Stock still NOT deducted
- [ ] Advance to "Ready"
- [ ] **Expected:** Stock still NOT deducted
- [ ] Advance to "Completed"
- [ ] **Expected:** Confirmation dialog appears
- [ ] Confirm completion
- [ ] **Expected:** Stock deducted to 90 units
- [ ] Navigate to Products page
- [ ] **Expected:** Product stock shows 90 units

---

### 12. Data Persistence

#### LocalStorage
- [ ] Create multiple orders (offline and online)
- [ ] Complete some orders
- [ ] Refresh the page (F5)
- [ ] **Expected:** All orders still visible
- [ ] **Expected:** Stats correct
- [ ] **Expected:** Dashboard data accurate

#### Supabase Sync (if configured)
- [ ] Create orders
- [ ] Check Supabase Dashboard → Table Editor → `orders` table
- [ ] **Expected:** Orders saved with all fields
- [ ] Log out and log in again
- [ ] **Expected:** Orders still visible
- [ ] Open another browser (or incognito)
- [ ] Login with same account
- [ ] **Expected:** Orders synced across sessions

---

### 13. Edge Cases & Error Handling

#### Insufficient Stock
- [ ] Create order with quantity > available stock
- [ ] Try to place order
- [ ] **Expected:** Toast error: "Insufficient stock for [Product] (X available)"
- [ ] **Expected:** Order NOT placed

#### Empty Order
- [ ] Click "New Order"
- [ ] Don't add any items
- [ ] Click "Place Order"
- [ ] **Expected:** Toast error: "Add at least one item"

#### No Product Selected
- [ ] Click "Add" button without selecting product
- [ ] **Expected:** Toast error: "Please select a product"

#### Negative Selling Price
- [ ] Enter negative or zero selling price
- [ ] **Expected:** Profit calculation shows loss (red)

#### Delivery Fee (Online Orders)
- [ ] Create online order
- [ ] Leave delivery fee as 0
- [ ] **Expected:** Total = Subtotal
- [ ] Enter delivery fee (e.g., 50)
- [ ] **Expected:** Total = Subtotal + 50
- [ ] Switch to "Offline" toggle
- [ ] **Expected:** Delivery section disappears
- [ ] **Expected:** Delivery fee reset to 0 in summary

---

## 🐛 Known Issues / Notes

### Fixed Issues
✅ Duplicate `deliveryFee` input removed
✅ Delivery fee display in summary added
✅ Chart invisible after theme switch — FIXED (re-renders automatically now)
✅ Sales data from old `sales` localStorage — migrated to orders-only

### Current Behavior
- **Old sales data:** If you have old data in `sales` localStorage key, it's NOT deleted but is no longer used. Dashboard/reports only read from `bb-orders`.
- **Stock deduction timing:** Only happens on order completion, not on order creation.
- **Profit calculation:** Excludes delivery fee (profit = items profit only, not affected by delivery charge).

---

## 📋 Performance Checklist

- [ ] Dashboard loads within 2 seconds
- [ ] Orders table renders smoothly with 50+ orders
- [ ] Search/filter responds instantly (no lag)
- [ ] Chart animations smooth (no stuttering)
- [ ] Modal opens/closes without delay
- [ ] Detail panel slides smoothly
- [ ] No console errors during normal usage

---

## 🔒 Security Checklist

- [ ] Supabase credentials not exposed in client code (only Anon Key used)
- [ ] RLS policies enforce user-level isolation
- [ ] No sensitive data logged to console in production
- [ ] Email confirmation prevents unauthorized access

---

## 📱 Mobile Responsiveness (Optional)

If testing on mobile/tablet:
- [ ] Dashboard cards stack vertically
- [ ] Orders table scrolls horizontally
- [ ] Modal fits screen without overflow
- [ ] Detail panel width adjusts to viewport
- [ ] Theme toggle accessible
- [ ] All buttons tappable (min 44px touch target)

---

## ✅ Final Validation

After completing all tests:
- [ ] No console errors or warnings
- [ ] All features working as expected
- [ ] Data persists correctly
- [ ] UI responsive and accessible
- [ ] Dark/Light mode fully functional
- [ ] Sales flow: Orders → Completion → Dashboard/Reports works end-to-end

---

## 🚀 Deployment Checklist

Before going live:
- [ ] Update `js/config.js` with production Supabase credentials
- [ ] Run all SQL migrations in production Supabase project
- [ ] Enable email confirmations in production
- [ ] Configure custom email templates (optional)
- [ ] Test with real user accounts
- [ ] Backup existing data (if any)
- [ ] Document any environment-specific settings

---

## 📞 Support

If issues occur:
1. Check browser console (F12) for errors
2. Verify Supabase schema matches `supabase-schema.sql`
3. Check `js/config.js` has correct credentials
4. Inspect localStorage: `bb-orders`, `bb-products`, `bb-purchases`
5. Verify RLS policies in Supabase Dashboard

For Supabase email issues:
- Check Supabase logs: Dashboard → Authentication → Logs
- Verify SMTP settings or use built-in provider
- Test email delivery with Supabase test tools

---

**Testing completed successfully? ✅**
**Ready for production deployment? 🚀**
