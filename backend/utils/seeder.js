require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Account  = require('../models/Account');
const Item     = require('../models/Item');
const Customer = require('../models/Customer');

const defaultAccounts = [
  // Assets
  { code: '1000', name: 'Cash in Hand',         type: 'asset',     group: 'Current Assets',    isSystem: true },
  { code: '1001', name: 'Bank - HDFC',           type: 'asset',     group: 'Current Assets',    isSystem: true },
  { code: '1010', name: 'Accounts Receivable',   type: 'asset',     group: 'Current Assets',    isSystem: true },
  { code: '1020', name: 'Inventory',             type: 'asset',     group: 'Current Assets',    isSystem: true },
  { code: '1030', name: 'GST Input Credit (CGST)',type: 'asset',    group: 'Current Assets',    isSystem: true },
  { code: '1031', name: 'GST Input Credit (SGST)',type: 'asset',    group: 'Current Assets',    isSystem: true },
  { code: '1032', name: 'GST Input Credit (IGST)',type: 'asset',    group: 'Current Assets',    isSystem: true },
  { code: '1100', name: 'Plant & Machinery',     type: 'asset',     group: 'Fixed Assets',      isSystem: true },
  { code: '1101', name: 'Land & Building',       type: 'asset',     group: 'Fixed Assets',      isSystem: true },
  // Liabilities
  { code: '2000', name: 'Accounts Payable',      type: 'liability', group: 'Current Liabilities',isSystem: true },
  { code: '2010', name: 'GST Payable (CGST)',    type: 'liability', group: 'Current Liabilities',isSystem: true },
  { code: '2011', name: 'GST Payable (SGST)',    type: 'liability', group: 'Current Liabilities',isSystem: true },
  { code: '2012', name: 'GST Payable (IGST)',    type: 'liability', group: 'Current Liabilities',isSystem: true },
  { code: '2020', name: 'TDS Payable',           type: 'liability', group: 'Current Liabilities',isSystem: true },
  { code: '2100', name: 'Bank Loan',             type: 'liability', group: 'Long-term Liabilities',isSystem: true },
  // Equity
  { code: '3000', name: 'Share Capital',         type: 'equity',    group: 'Equity',            isSystem: true },
  { code: '3010', name: 'Retained Earnings',     type: 'equity',    group: 'Equity',            isSystem: true },
  // Income
  { code: '4000', name: 'Biodiesel Sales',       type: 'income',    group: 'Revenue',           isSystem: true },
  { code: '4010', name: 'Processing Services',   type: 'income',    group: 'Revenue',           isSystem: false },
  { code: '4020', name: 'Other Income',          type: 'income',    group: 'Revenue',           isSystem: false },
  // Expenses
  { code: '5000', name: 'Raw Material Cost',     type: 'expense',   group: 'Cost of Goods Sold',isSystem: true },
  { code: '5010', name: 'Processing Cost',       type: 'expense',   group: 'Cost of Goods Sold',isSystem: false },
  { code: '5020', name: 'Transportation Cost',   type: 'expense',   group: 'Operating Expenses',isSystem: false },
  { code: '5030', name: 'Employee Salaries',     type: 'expense',   group: 'Operating Expenses',isSystem: false },
  { code: '5040', name: 'Electricity',           type: 'expense',   group: 'Operating Expenses',isSystem: false },
  { code: '5050', name: 'Depreciation',          type: 'expense',   group: 'Operating Expenses',isSystem: false },
  { code: '5060', name: 'Bank Charges',          type: 'expense',   group: 'Operating Expenses',isSystem: false },
  { code: '5070', name: 'Miscellaneous Expenses',type: 'expense',   group: 'Operating Expenses',isSystem: false },
];

const defaultItems = [
  { sku: 'BIO-001', name: 'Biodiesel B100',   hsnCode: '27102000', unit: 'ltr', salePrice: 85,  purchasePrice: 60,  gstRate: 5,  currentStock: 5000, type: 'product', category: 'Biodiesel' },
  { sku: 'BIO-002', name: 'Biodiesel B20',    hsnCode: '27102000', unit: 'ltr', salePrice: 75,  purchasePrice: 52,  gstRate: 5,  currentStock: 3000, type: 'product', category: 'Biodiesel' },
  { sku: 'RAW-001', name: 'Used Cooking Oil', hsnCode: '15179010', unit: 'kg',  salePrice: 30,  purchasePrice: 22,  gstRate: 5,  currentStock: 8000, type: 'product', category: 'Raw Material' },
  { sku: 'RAW-002', name: 'Palm Stearin',     hsnCode: '15119090', unit: 'kg',  salePrice: 45,  purchasePrice: 35,  gstRate: 5,  currentStock: 2000, type: 'product', category: 'Raw Material' },
  { sku: 'SRV-001', name: 'Processing Services', hsnCode: '999700', unit: 'pcs', salePrice: 5000, purchasePrice: 0, gstRate: 18, currentStock: 0,    type: 'service',  category: 'Services' },
];

const defaultCustomers = [
  { name: 'Gujarat State Petroleum Corp', email: 'procurement@gspc.in', phone: '07926305000', gstin: '24AABCG1234A1Z5', stateCode: '24', stateName: 'Gujarat', openingBalance: 0 },
  { name: 'Indian Oil Corporation',       email: 'vendor@iocl.co.in',  phone: '01124672000', gstin: '07AAACD1234A1ZA', stateCode: '07', stateName: 'Delhi',   openingBalance: 0 },
  { name: 'Reliance Industries Ltd',      email: 'reliance@ril.com',   phone: '02244770000', gstin: '27AAACR5055K1ZK', stateCode: '27', stateName: 'Maharashtra', openingBalance: 0 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([
    User.deleteMany({}),
    Account.deleteMany({}),
    Item.deleteMany({}),
    Customer.deleteMany({})
  ]);

  // Create admin user
  await User.create({
    name:         'Admin - Tesseract',
    email:        'admin@tesseractflexfuel.com',
    password:     'Admin@123',
    role:         'admin',
    organization: 'Tesseract Flex Fuel'
  });

  await User.create({
    name:         'Accountant',
    email:        'accountant@tesseractflexfuel.com',
    password:     'Account@123',
    role:         'accountant',
    organization: 'Tesseract Flex Fuel'
  });

  await Account.insertMany(defaultAccounts);
  await Item.insertMany(defaultItems);
  await Customer.insertMany(defaultCustomers);

  console.log('✅ Seed complete!');
  console.log('Admin:      admin@tesseractflexfuel.com / Admin@123');
  console.log('Accountant: accountant@tesseractflexfuel.com / Account@123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
