const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ─── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Static Files (uploaded docs) ─────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth',         require('./routes/auth'));
app.use('/api/v1/users',        require('./routes/users'));
app.use('/api/v1/accounts',     require('./routes/accounts'));
app.use('/api/v1/customers',    require('./routes/customers'));
app.use('/api/v1/vendors',      require('./routes/vendors'));
app.use('/api/v1/items',        require('./routes/items'));
app.use('/api/v1/invoices',     require('./routes/invoices'));
app.use('/api/v1/purchases',    require('./routes/purchases'));
app.use('/api/v1/payments',     require('./routes/payments'));
app.use('/api/v1/journal',      require('./routes/journal'));
app.use('/api/v1/bank',         require('./routes/bank'));
app.use('/api/v1/gst',          require('./routes/gst'));
app.use('/api/v1/reports',      require('./routes/reports'));
app.use('/api/v1/documents',    require('./routes/documents'));
app.use('/api/v1/dashboard',    require('./routes/dashboard'));
app.use('/api/v1/parties',      require('./routes/parties'));
app.use('/api/v1/production',    require('./routes/production'));

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'GreenLedger API' }));

// ─── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Database & Server Start ───────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 GreenLedger API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });