# 📦 Production-Grade ERP: Vendor, Inventory & Purchase Management

A **PRODUCTION-READY**, **ACCOUNTING-CORRECT**, **FULLY RESPONSIVE** Enterprise Resource Planning (ERP) system built for real business operations. This application follows strict accounting principles with ledger-based balance calculation, comprehensive audit logging, and mobile-first responsive design.

## ✨ Core Features

### 🔐 Authentication & Security
- JWT-based authentication (Access + Refresh tokens)
- Role-based access control (Admin & Staff)
- Password hashing with bcrypt
- Secure API routes with middleware protection
- Audit logging for all critical operations

### 👥 Vendor Management
- Complete CRUD operations with soft delete
- Opening balance with Debit/Credit type selection
- **Derived balance calculation** from ledger (accounting-correct)
- Active/Inactive status management
- Search and filter capabilities
- **Desktop**: Table view with inline actions
- **Mobile**: Card-based view with touch-friendly actions

### 🛒 Purchase Management
- Multi-item purchase invoices
- **Tax Type**: Inclusive or Exclusive calculations
- Automatic tax calculations (GST/VAT)
- Invoice file upload (PDF/Images) with Cloudinary
- Purchase status tracking (Pending/Partial/Paid)
- Auto-update inventory stock levels
- **Desktop**: Single-page optimized form
- **Mobile**: Step-based wizard (Vendor → Invoice → Items → Review)

### 💰 Payment Management
- Multiple payment modes (Cash, UPI, Bank Transfer)
- Reference number tracking
- **Balance validation**: Cannot exceed pending amount
- Automatic ledger entry creation
- Purchase-specific or general payments
- Payment history with filters

### 📒 Ledger System (Single Source of Truth)
- **Accounting-correct**: Balance = Opening + Debits - Credits
- No manual balance storage in vendor records
- Entry types: Opening, Purchase, Payment, Adjustment
- Running balance calculation on-the-fly
- Reverse entry support for corrections
- Soft delete with audit trail
- Date-based filtering and reporting

### 📦 Inventory Management
- Real-time stock tracking
- Minimum stock level alerts
- Low stock notifications
- Stock movement history
- Category-based organization
- Last purchase rate tracking

### 📊 Reports & Analytics
- **Vendor Report**: Balance, purchases, payments summary
- **Purchase Report**: Date range, status, vendor filters
- **Payment Report**: Mode-wise breakdown
- **Inventory Report**: Stock levels, low stock items
- **Ledger Report**: Complete transaction history
- **Monthly Summary**: Comprehensive business overview
- Date range filtering before export
- On-screen preview capability
- Export formats: PDF & Excel (ready for integration)

### 🎨 UX & Design Excellence
- **Mobile-First**: Bottom navigation, card views, one-hand usability
- **Desktop-Optimized**: Sidebar navigation, table views, multi-column forms
- **Skeleton Loaders**: Professional loading states
- **Toast Notifications**: Real-time feedback
- **Confirm Dialogs**: Safe delete operations
- **Empty States**: Friendly onboarding
- **Badge Components**: Status indicators
- **Color Coding**: Red (Debit), Green (Credit), Blue (Action)
- **Framer Motion**: Smooth micro-animations

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- TanStack Query
- Framer Motion
- Recharts

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Multer + Cloudinary
- Bcrypt

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running
- Cloudinary account (for file uploads)

### Installation

1. **Clone the repository**
```bash
cd invantory-managemant
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**

Create a `.env` file in the root directory:
```env
# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory_management
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
NODE_ENV=development

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

4. **Seed Database**
```bash
npm run seed
```

This will create:
- Admin user: `admin@example.com` / `password123`
- Staff user: `staff@example.com` / `password123`
- Sample vendors

5. **Start Development Servers**

Terminal 1 - Backend:
```bash
npm run server:dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

6. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
invantory-managemant/
├── app/                      # Next.js app directory
│   ├── (dashboard)/         # Dashboard routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── vendors/         # Vendor management
│   │   ├── purchases/       # Purchase management
│   │   ├── inventory/       # Inventory tracking
│   │   ├── payments/        # Payment recording
│   │   ├── ledger/          # Ledger view
│   │   ├── reports/         # Reports
│   │   └── layout.tsx       # Dashboard layout
│   ├── login/               # Login page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── providers.tsx        # React Query provider
├── backend/
│   ├── config/              # Database & Cloudinary config
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Auth & upload middleware
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   ├── utils/               # Helper functions
│   ├── server.js            # Express server
│   └── seed.js              # Database seeder
├── components/
│   ├── layout/              # Layout components
│   └── ui/                  # Reusable UI components
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities & API client
└── README.md
```

## 🎯 Accounting Principles (NON-NEGOTIABLE)

### 1. Ledger is the Single Source of Truth
- Vendor balance is **NEVER** stored manually
- Balance is **ALWAYS** calculated from ledger entries
- Formula: `Balance = Opening Balance + Sum(Debits) - Sum(Credits)`

### 2. Double-Entry Bookkeeping
- Every transaction creates a ledger entry
- Purchases create DEBIT entries (increase liability)
- Payments create CREDIT entries (decrease liability)
- Opening balance respects Debit/Credit type

### 3. Immutable Transactions
- Ledger entries use soft delete (never hard delete)
- Edit/Delete creates reverse adjustment entry
- Full audit trail maintained
- Who, What, When tracked for all operations

### 4. Tax Calculations
**Exclusive Tax** (Default):
```
Subtotal = Quantity × Rate
Tax = Subtotal × Tax%
Total = Subtotal + Tax
```

**Inclusive Tax**:
```
Total = Quantity × Rate
Subtotal = Total / (1 + Tax%)
Tax = Total - Subtotal
```

### 5. Payment Validation
- Payment amount cannot exceed vendor's current balance
- Prevents overpayment errors
- Real-time balance checking

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Vendors
- `GET /api/vendors` - Get all vendors (with calculated balance)
- `POST /api/vendors` - Create vendor (with opening balance)
- `GET /api/vendors/:id` - Get vendor by ID (with balance)
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Soft delete vendor
- `GET /api/vendors/stats` - Get vendor statistics

### Purchases
- `GET /api/purchases` - Get all purchases (with filters)
- `POST /api/purchases` - Create purchase (with items & tax type)
- `GET /api/purchases/:id` - Get purchase details with items
- `GET /api/purchases/stats` - Get purchase statistics

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create item
- `GET /api/items/:id` - Get item by ID
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Soft delete item
- `GET /api/items/low-stock` - Get low stock items

### Payments
- `GET /api/payments` - Get all payments (with filters)
- `POST /api/payments` - Create payment (with balance validation)
- `GET /api/payments/:id` - Get payment by ID

### Ledger
- `GET /api/ledger` - Get all ledger entries
- `GET /api/ledger/vendor/:vendorId` - Get vendor ledger with running balance

### Reports
- `GET /api/reports/vendors` - Vendor report with filters
- `GET /api/reports/purchases` - Purchase report with summary
- `GET /api/reports/payments` - Payment report with mode breakdown
- `GET /api/reports/inventory` - Inventory report with stock status
- `GET /api/reports/ledger` - Ledger report with running balance
- `GET /api/reports/monthly-summary` - Monthly business summary

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🗄️ Database Schema

### Vendor Model
```javascript
{
  name: String (required),
  phone: String (required),
  email: String,
  address: String,
  gstNumber: String,
  openingBalance: Number (default: 0),
  openingBalanceType: Enum ['debit', 'credit'] (default: 'debit'),
  status: Enum ['active', 'inactive'] (default: 'active'),
  isDeleted: Boolean (default: false),
  deletedAt: Date,
  deletedBy: ObjectId (User),
  createdBy: ObjectId (User),
  timestamps: true
}
```

### Purchase Model
```javascript
{
  vendor: ObjectId (Vendor),
  invoiceNumber: String (required, unique),
  invoiceDate: Date (required),
  invoiceFile: { url: String, publicId: String },
  taxType: Enum ['inclusive', 'exclusive'] (default: 'exclusive'),
  subtotal: Number (required),
  totalTax: Number (default: 0),
  total: Number (required),
  paidAmount: Number (default: 0),
  pendingAmount: Number (required),
  status: Enum ['pending', 'partial', 'paid'] (default: 'pending'),
  notes: String,
  isDeleted: Boolean,
  createdBy: ObjectId (User),
  timestamps: true
}
```

### Ledger Model (Source of Truth)
```javascript
{
  vendor: ObjectId (Vendor),
  date: Date (required),
  type: Enum ['opening', 'purchase', 'payment', 'adjustment'] (required),
  reference: String,
  referenceId: ObjectId,
  debit: Number (default: 0),
  credit: Number (default: 0),
  description: String,
  isDeleted: Boolean (default: false),
  createdBy: ObjectId (User),
  timestamps: true
}
```

### AuditLog Model
```javascript
{
  user: ObjectId (User),
  action: Enum ['create', 'update', 'delete', 'login', 'logout'],
  entity: Enum ['vendor', 'purchase', 'payment', 'item', 'ledger', 'user'],
  entityId: ObjectId,
  changes: Mixed,
  ipAddress: String,
  userAgent: String,
  description: String,
  timestamps: true
}
```

## 📱 Responsive Design

The application is fully responsive with:
- **Desktop (≥1024px)**: Sidebar navigation, table views, multi-column forms
- **Tablet (768-1023px)**: Collapsible sidebar, 2-column grids
- **Mobile (≤767px)**: Bottom navigation, card views, single-column forms, step wizards

## Production Deployment

1. **Build the frontend**
```bash
npm run build
```

2. **Start production server**
```bash
npm start
```

3. **Environment Variables**
- Update `MONGODB_URI` to production database
- Change JWT secrets to strong random strings
- Configure Cloudinary for production
- Set `NODE_ENV=production`

## 🚀 Implementation Highlights

### Accounting-Correct Architecture
✅ **Derived Balance Calculation**
- Vendor balance calculated from ledger entries, not stored
- Prevents data inconsistency
- Single source of truth principle

✅ **Tax Type Support**
- Inclusive: Tax included in item rate
- Exclusive: Tax added on top of item rate
- Accurate calculations for both methods

✅ **Immutable Ledger**
- Soft delete with audit trail
- Reverse entries for corrections
- Complete transaction history

### Production-Ready Features
✅ **Comprehensive Audit Logging**
- Who performed the action
- What was changed (old vs new)
- When it happened
- IP address and user agent tracking

✅ **Soft Delete Pattern**
- No data loss
- Recoverable records
- Maintains referential integrity

✅ **Balance Validation**
- Cannot pay more than owed
- Real-time balance checking
- Prevents accounting errors

✅ **Responsive Design**
- Mobile: Bottom nav, cards, step wizards
- Desktop: Sidebar, tables, multi-column forms
- Tablet: Hybrid responsive layout

### Developer Experience
✅ **Clean Code Architecture**
- Separation of concerns
- Reusable utility functions
- Consistent error handling
- Environment-based configuration

✅ **Type Safety**
- TypeScript for frontend
- Zod validation schemas
- Mongoose schema validation

✅ **API Design**
- RESTful endpoints
- Consistent response format
- Proper HTTP status codes
- Query parameter filtering

## 🎯 Key Differentiators

| Feature | This ERP | Typical Systems |
|---------|----------|-----------------|
| Balance Calculation | ✅ Derived from ledger | ❌ Stored manually |
| Tax Handling | ✅ Inclusive & Exclusive | ❌ One type only |
| Audit Trail | ✅ Complete with changes | ❌ Basic or none |
| Soft Delete | ✅ All entities | ❌ Hard delete |
| Mobile UX | ✅ Step wizards, cards | ❌ Desktop-only |
| Payment Validation | ✅ Balance checking | ❌ No validation |
| Ledger System | ✅ Immutable entries | ❌ Editable records |
| Reports | ✅ Pre-filtered export | ❌ Export all data |

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
