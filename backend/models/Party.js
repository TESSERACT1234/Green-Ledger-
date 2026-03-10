const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['director', 'employee', 'contractor', 'expense_account']
  },

  // ── Common Fields ─────────────────────────────────────────────
  name:        { type: String, required: true, trim: true },
  code:        { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       { type: String, trim: true },
  address:     { type: String },
  panNumber:   { type: String, uppercase: true, trim: true },
  aadharNumber:{ type: String, trim: true },
  bankName:    { type: String },
  bankAccount: { type: String },
  ifscCode:    { type: String, uppercase: true },
  notes:       { type: String },
  isActive:    { type: Boolean, default: true },
  joinDate:    { type: Date },

  // ── Director Fields ───────────────────────────────────────────
  designation:      { type: String },          // CEO, CFO, MD etc.
  dinNumber:        { type: String },          // Director Identification Number
  shareholding:     { type: Number, default: 0 }, // % shareholding
  drawingsAccount:  { type: Number, default: 0 }, // Current drawings balance
  profitSharePercent: { type: Number, default: 0 },
  capitalContributed: { type: Number, default: 0 },
  loanGiven:          { type: Number, default: 0 },
  loanRepaid:         { type: Number, default: 0 },
  loanOutstanding:    { type: Number, default: 0 },

  // ── Employee Fields ───────────────────────────────────────────
  department:       { type: String },
  employeeId:       { type: String, unique: true, sparse: true },
  basicSalary:      { type: Number, default: 0 },
  hra:              { type: Number, default: 0 },
  otherAllowances:  { type: Number, default: 0 },
  grossSalary:      { type: Number, default: 0 },
  pfApplicable:     { type: Boolean, default: false },
  esiApplicable:    { type: Boolean, default: false },
  tdsRate:          { type: Number, default: 0 },
  advanceBalance:   { type: Number, default: 0 },  // Outstanding advance
  leaveBalance:     { type: Number, default: 0 },

  // ── Contractor Fields ─────────────────────────────────────────
  gstin:            { type: String, uppercase: true, trim: true },
  tdsSection:       { type: String },          // 194C, 194J etc.
  tdsPercent:       { type: Number, default: 0 },
  contractValue:    { type: Number, default: 0 },
  contractStart:    { type: Date },
  contractEnd:      { type: Date },
  serviceType:      { type: String },

  // ── Expense Account Fields ────────────────────────────────────
  expenseCategory:  { type: String },          // Utilities, Maintenance, etc.
  budgetMonthly:    { type: Number, default: 0 },
  linkedAccount:    { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },

  // ── Transactions summary (computed) ──────────────────────────
  totalPaid:        { type: Number, default: 0 },
  lastTransactionDate: { type: Date },

}, { timestamps: true });

// Auto-generate code before save
partySchema.pre('save', async function(next) {
  if (!this.code) {
    const count = await mongoose.model('Party').countDocuments({ type: this.type });
    const prefix = { director:'DIR', employee:'EMP', contractor:'CON', expense_account:'EXP' }[this.type];
    this.code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.type === 'employee') {
    this.grossSalary = (this.basicSalary || 0) + (this.hra || 0) + (this.otherAllowances || 0);
  }
  next();
});

partySchema.index({ type: 1 });
partySchema.index({ name: 1 });
partySchema.index({ employeeId: 1 });

module.exports = mongoose.model('Party', partySchema);