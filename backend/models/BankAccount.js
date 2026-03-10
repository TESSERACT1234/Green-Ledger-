const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  accountName:   { type: String, required: true },
  bankName:      { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode:      { type: String, uppercase: true },
  accountType:   { type: String, enum: ['current','savings','cash'], default: 'current' },
  openingBalance:{ type: Number, default: 0 },
  currentBalance:{ type: Number, default: 0 },
  currency:      { type: String, default: 'INR' },
  isActive:      { type: Boolean, default: true },
  isPrimary:     { type: Boolean, default: false },
  linkedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
