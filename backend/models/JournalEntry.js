const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
  account:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accountName: { type: String, required: true },
  accountCode: { type: String },
  debit:       { type: Number, default: 0 },
  credit:      { type: Number, default: 0 },
  description: { type: String }
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, unique: true },
  entryDate:   { type: Date, required: true, default: Date.now },
  description: { type: String, required: true },
  type:        { type: String, enum: ['manual','auto_invoice','auto_purchase','auto_payment'], default: 'manual' },
  status:      { type: String, enum: ['draft','pending_approval','approved','posted'], default: 'draft' },
  lines:       { type: [journalLineSchema], validate: [v => v.length >= 2, 'Minimum 2 lines required'] },
  totalDebit:  { type: Number },
  totalCredit: { type: Number },
  reference:   { type: String },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:  { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Validate debit = credit before save
journalEntrySchema.pre('save', async function(next) {
  if (!this.entryNumber) {
    const count = await mongoose.model('JournalEntry').countDocuments();
    const year  = new Date().getFullYear();
    this.entryNumber = `JE-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  this.totalDebit  = this.lines.reduce((s, l) => s + l.debit, 0);
  this.totalCredit = this.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
    return next(new Error(`Journal entry not balanced: Debit ${this.totalDebit} ≠ Credit ${this.totalCredit}`));
  }
  next();
});

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
