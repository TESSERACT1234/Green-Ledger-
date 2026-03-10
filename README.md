# 🌿 GreenLedger — Tesseract Flex Fuel Accounting System

Production-grade MERN stack accounting software built specifically for **Tesseract Flex Fuel**  
(Biodiesel Manufacturing, Gujarat, India) with full **India GST** support.

---

## 📁 Project Structure

```
greenledger/
├── backend/                  # Node.js + Express + MongoDB
│   ├── server.js             # Entry point
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Account.js        # Chart of Accounts
│   │   ├── Customer.js
│   │   ├── Vendor.js
│   │   ├── Item.js           # Products + Inventory
│   │   ├── Invoice.js        # Sales with GST
│   │   ├── Purchase.js       # Purchase Bills
│   │   ├── Payment.js        # Payments & Receipts
│   │   ├── JournalEntry.js   # Double-entry bookkeeping
│   │   ├── BankAccount.js
│   │   └── Document.js
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── invoiceController.js
│   │   ├── reportsController.js
│   │   └── dashboardController.js
│   ├── routes/               # Express routers (all modules)
│   ├── middleware/
│   │   └── auth.js           # JWT + RBAC
│   └── utils/
│       ├── seeder.js         # Default data seed
│       ├── crudRouter.js     # Generic CRUD factory
│       └── indianStates.js   # GST state codes
│
├── frontend/                 # React.js
│   ├── src/
│   │   ├── App.js            # Router + Auth guards
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── utils/
│   │   │   └── api.js        # Axios with interceptors
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Sidebar.js
│   │   │       └── AppLayout.js
│   │   ├── pages/            # All 16 pages
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js  # KPIs + Charts
│   │   │   ├── Customers.js  # Full CRUD
│   │   │   ├── Invoices.js   # GST Invoice with auto-calc
│   │   │   ├── Purchases.js  # Purchase Bills
│   │   │   ├── Payments.js   # Receipts & Payments
│   │   │   ├── Items.js      # Inventory
│   │   │   ├── Reports.js    # P&L, GST, Stock, Trial Balance
│   │   │   └── ...           # Vendors, Accounts, Journal, etc.
│   │   └── styles/
│   │       └── global.css    # White + Green design system
│
└── docker-compose.yml        # Full stack deployment
```

---

## 🚀 SETUP FROM SCRATCH (Step by Step)

### Prerequisites
- Node.js 18+ → https://nodejs.org
- MongoDB 7+ → https://www.mongodb.com/try/download/community
- Git

---

### STEP 1 — Clone / Download Project

```bash
# If using git
git clone <your-repo-url>
cd greenledger

# Or just navigate to the folder you downloaded
cd greenledger
```

---

### STEP 2 — Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your values:
# MONGO_URI=mongodb://localhost:27017/greenledger
# JWT_SECRET=any_long_random_string_here
# PORT=5000
```

---

### STEP 3 — Start MongoDB

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows — start MongoDB service from Services panel
# Or: mongod --dbpath C:\data\db
```

---

### STEP 4 — Seed Default Data

```bash
cd backend
npm run seed
```

This creates:
- ✅ Admin user: `admin@tesseractflexfuel.com` / `Admin@123`
- ✅ Accountant: `accountant@tesseractflexfuel.com` / `Account@123`
- ✅ 28 Chart of Accounts (tailored for Biodiesel company)
- ✅ 5 default products (Biodiesel B100, B20, raw materials)
- ✅ 3 sample customers (GSPC, IOCL, Reliance)

---

### STEP 5 — Start Backend

```bash
cd backend
npm run dev   # Development (with nodemon)
# OR
npm start     # Production
```

Backend runs at: **http://localhost:5000**
Health check: http://localhost:5000/health

---

### STEP 6 — Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# REACT_APP_API_URL=http://localhost:5000/api/v1
```

---

### STEP 7 — Start Frontend

```bash
cd frontend
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🐳 DOCKER DEPLOYMENT (Production)

```bash
# From root greenledger folder
docker-compose up --build -d

# Then seed the database
docker exec greenledger-api node utils/seeder.js
```

Access: http://localhost:3000

---

## 📡 API Endpoints Reference

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| POST   | /api/v1/auth/login              | Login                          |
| POST   | /api/v1/auth/register           | Register user                  |
| GET    | /api/v1/dashboard               | Dashboard KPIs                 |
| GET    | /api/v1/customers               | List customers                 |
| POST   | /api/v1/customers               | Add customer                   |
| GET    | /api/v1/vendors                 | List vendors                   |
| POST   | /api/v1/vendors                 | Add vendor                     |
| GET    | /api/v1/items                   | List products                  |
| POST   | /api/v1/items                   | Add product                    |
| GET    | /api/v1/invoices                | List invoices                  |
| POST   | /api/v1/invoices                | Create GST invoice             |
| GET    | /api/v1/invoices/:id            | Get invoice detail             |
| GET    | /api/v1/purchases               | List purchase bills            |
| POST   | /api/v1/purchases               | Create purchase bill           |
| GET    | /api/v1/payments                | List payments                  |
| POST   | /api/v1/payments                | Record payment/receipt         |
| GET    | /api/v1/accounts                | Chart of accounts              |
| GET    | /api/v1/journal                 | Journal entries                |
| POST   | /api/v1/journal/:id/approve     | Approve entry (Admin only)     |
| GET    | /api/v1/reports/profit-loss     | P&L report                     |
| GET    | /api/v1/reports/trial-balance   | Trial balance                  |
| GET    | /api/v1/reports/gst-summary     | GST output vs input credit     |
| GET    | /api/v1/reports/stock-summary   | Stock with values              |
| GET    | /api/v1/reports/customer-outstanding | Aged receivables         |
| POST   | /api/v1/documents/upload        | Upload document                |
| GET    | /api/v1/gst/rates               | GST rates list                 |
| GET    | /api/v1/gst/states              | Indian states list             |

---

## 🇮🇳 GST Logic

- **Intra-state sales** (Customer state = Gujarat = 24) → CGST + SGST (split equally)
- **Inter-state sales** (Customer state ≠ 24) → IGST only
- GST rates supported: 0%, 5%, 12%, 18%, 28%
- HSN codes stored on each product
- GST Summary report shows: Output Tax, Input Credit, Net Liability

---

## 👥 User Roles

| Feature                    | Admin | Accountant |
|---------------------------|-------|-----------|
| Dashboard                 | ✅    | ✅        |
| Create Invoices           | ✅    | ✅        |
| Create Purchases          | ✅    | ✅        |
| Record Payments           | ✅    | ✅        |
| Manage Customers/Vendors  | ✅    | ✅        |
| View Reports              | ✅    | ✅        |
| Manage Chart of Accounts  | ✅    | ❌        |
| Approve Journal Entries   | ✅    | ❌        |
| Manage Users              | ✅    | ❌        |
| System Settings           | ✅    | ❌        |

---

## 🔒 Security

- JWT access tokens (15 min) + refresh tokens (7 days)
- bcrypt password hashing (salt rounds: 12)
- RBAC enforced at API middleware level
- Rate limiting: 200 req/15min (login stricter)
- Helmet.js security headers
- CORS configured to frontend URL only

---

## 🛠️ Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18, React Router v6, Recharts, Axios    |
| Styling   | Custom CSS Design System (white + green)      |
| Backend   | Node.js, Express.js                           |
| Database  | MongoDB + Mongoose ORM                        |
| Auth      | JWT (access + refresh tokens)                 |
| Deploy    | Docker + docker-compose                       |

---

## 📞 Support

Built for **Tesseract Flex Fuel** — Biodiesel Manufacturing, Gujarat  
GreenLedger v1.0
