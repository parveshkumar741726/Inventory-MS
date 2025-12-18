# 🚀 Quick Start Guide

## ✅ Issue Fixed

**Error Fixed**: Changed `authMiddleware` to `auth` in `reportRoutes.js`

The server is now ready to run!

---

## 🏃 Running the Application

### Step 1: Start Backend Server

```bash
cd backend
npm run server:dev
```

**Note**: If you see "Port 5000 already in use", that means the server is already running. You can:
- Use the existing running server, OR
- Stop it and restart, OR
- Change port in `.env` file

### Step 2: Start Frontend (New Terminal)

```bash
npm run dev
```

### Step 3: Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Step 4: Login

```
Email: admin@example.com
Password: password123
```

---

## 📊 What's Included

### ✅ Complete Backend (33 API Endpoints)
- Authentication & Authorization
- Vendor Management (with derived balance)
- Purchase Management (tax inclusive/exclusive)
- Payment Management (with balance validation)
- Inventory Management
- Ledger System (running balance)
- 6 Comprehensive Reports
- Audit Logging

### ✅ Complete Frontend (All Pages)
- **Dashboard**: Metrics, charts, recent activity
- **Vendors**: List + Detail page with tabs
- **Purchases**: Complete purchase history
- **Payments**: Record and track payments
- **Inventory**: Stock levels and alerts
- **Ledger**: Running balance display
- **Reports**: 6 reports with filters

### ✅ Production Features
- Accounting-correct (ledger-based balance)
- Tax calculations (inclusive & exclusive)
- Audit trail (complete logging)
- Soft delete (no data loss)
- Payment validation (cannot overpay)
- Responsive design (mobile + desktop)
- Opening balance with debit/credit type

---

## 🧪 Test the Features

1. **Dashboard** → View business metrics
2. **Vendors** → Add vendor → Click to view details
3. **Vendor Detail** → Check all 4 tabs (Overview, Purchases, Payments, Ledger)
4. **Purchases** → View purchase history
5. **Payments** → Record a payment
6. **Ledger** → See running balance
7. **Reports** → Generate reports with filters

---

## 📦 Sample Data Included

The seed data includes:
- ✅ 2 Users (Admin + Staff)
- ✅ 3 Vendors with opening balances
- ✅ 4 Items (Laptops, Chairs, Paper, Mouse)
- ✅ 3 Purchases (pending, partial, paid)
- ✅ 3 Payments (cash, UPI, bank)
- ✅ 9 Ledger entries

---

## 🎯 Key Features to Test

### 1. Derived Balance (Accounting-Correct)
- Go to Vendors → Check balance
- Go to Ledger → See how balance is calculated
- Balance = Opening + Debits - Credits ✅

### 2. Tax Type Support
- Create purchase with "Exclusive" tax → Tax added on top
- Create purchase with "Inclusive" tax → Tax included in price

### 3. Payment Validation
- Try to pay more than vendor balance → Will show error ✅

### 4. Running Balance in Ledger
- Go to Ledger → Select vendor
- See running balance after each transaction ✅

### 5. Reports with Filters
- Go to Reports → Click "View" on any report
- Apply date filters → See filtered data ✅

### 6. Vendor Detail Tabs
- Click any vendor → See 4 tabs
- Overview, Purchases, Payments, Ledger ✅

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Windows: Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
```

### MongoDB Connection Error
```bash
# Check MongoDB is running
# Update MONGODB_URI in .env if needed
```

### Frontend Build Error
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📚 API Documentation

All API endpoints are documented in `README.md`

**Base URL**: http://localhost:5000/api

**Authentication**: Bearer token in Authorization header

---

## 🎉 You're All Set!

Your production-grade ERP system is ready to use. All features are implemented and tested.

**Need Help?** Check `README.md` and `IMPLEMENTATION_SUMMARY.md` for detailed documentation.
