const mongoose = require('mongoose');

const partyTransactionSchema = new mongoose.Schema({
  party:       { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyType:   { type: String, required: true },
  partyName:   { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'salary_payment',     // Employee monthly salary
      'advance_given',      // Salary advance to employee
      'advance_recovery',   // Deducted from salary
      'drawings',           // Director drawings
      'profit_share',       // Director profit distribution
      'contractor_payment', // Payment to contractor
      'expense_payment',    // Expense account payment
      'reimbursement',      // Expense reimbursement
      'tds_deduction',      // TDS deducted
      'pf_contribution',    // PF employer contribution
      'capital_investment', // Director injects equity into company
      'director_loan',      // Director gives loan to company
      'loan_repayment',     // Company repays loan to director
    ]
  },
  amount:       { type: Number, required: true, min: 0.01 },
  date:         { type: Date, required: true, default: Date.now },
  month:        { type: String },   // "2024-01" for salary month
  description:  { type: String },
  paymentMode:  { type: String, enum: ['cash','bank','upi','cheque','neft','rtgs'], default: 'bank' },
  reference:    { type: String },   // Cheque no, UTR etc.
  tdsAmount:    { type: Number, default: 0 },
  netAmount:    { type: Number },   // After TDS
  bankAccountId:   { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  bankAccountName: { type: String },
  status:          { type: String, enum: ['pending','paid','cancelled'], default: 'paid' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments:  [{ type: String }]
}, { timestamps: true });

partyTransactionSchema.pre('save', function(next) {
  this.netAmount = this.amount - (this.tdsAmount || 0);
  next();
});

partyTransactionSchema.index({ party: 1 });
partyTransactionSchema.index({ date: -1 });
partyTransactionSchema.index({ type: 1 });
partyTransactionSchema.index({ month: 1 });

module.exports = mongoose.model('PartyTransaction', partyTransactionSchema);