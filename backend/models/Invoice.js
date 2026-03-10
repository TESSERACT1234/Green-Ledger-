const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  item:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName:    { type: String, required: true },
  hsnCode:     { type: String },
  qty:         { type: Number, required: true, min: 0.01 },
  rate:        { type: Number, required: true, min: 0 },
  discount:    { type: Number, default: 0 },
  taxableAmt:  { type: Number, required: true },
  gstRate:     { type: Number, required: true },
  cgstRate:    { type: Number, default: 0 },
  sgstRate:    { type: Number, default: 0 },
  igstRate:    { type: Number, default: 0 },
  cgstAmt:     { type: Number, default: 0 },
  sgstAmt:     { type: Number, default: 0 },
  igstAmt:     { type: Number, default: 0 },
  totalAmt:    { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  customer:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName:  { type: String, required: true },
  customerGstin: { type: String },
  invoiceDate:   { type: Date, required: true, default: Date.now },
  dueDate:       { type: Date },
  lineItems:     [lineItemSchema],
  subtotal:      { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  cgstAmount:    { type: Number, default: 0 },
  sgstAmount:    { type: Number, default: 0 },
  igstAmount:    { type: Number, default: 0 },
  totalTax:      { type: Number, default: 0 },
  totalAmount:   { type: Number, required: true },
  paidAmount:    { type: Number, default: 0 },
  balanceDue:    { type: Number },
  status:        { type: String, enum: ['draft','sent','partial','paid','overdue','cancelled'], default: 'draft' },
  isIGST:        { type: Boolean, default: false },
  notes:         { type: String },
  terms:         { type: String },
  journalEntry:  { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year  = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  this.balanceDue = this.totalAmount - this.paidAmount;
  next();
});

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
