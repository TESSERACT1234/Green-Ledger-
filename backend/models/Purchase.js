const mongoose = require('mongoose');

const purchaseLineSchema = new mongoose.Schema({
  item:       { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName:   { type: String, required: true },
  hsnCode:    { type: String },
  qty:        { type: Number, required: true, min: 0.01 },
  rate:       { type: Number, required: true, min: 0 },
  taxableAmt: { type: Number, required: true },
  gstRate:    { type: Number, required: true },
  cgstAmt:    { type: Number, default: 0 },
  sgstAmt:    { type: Number, default: 0 },
  igstAmt:    { type: Number, default: 0 },
  totalAmt:   { type: Number, required: true }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  billNumber:   { type: String, unique: true },
  vendor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName:   { type: String, required: true },
  vendorGstin:  { type: String },
  refNumber:    { type: String },
  billDate:     { type: Date, required: true, default: Date.now },
  dueDate:      { type: Date },
  lineItems:    [purchaseLineSchema],
  subtotal:     { type: Number, required: true },
  taxableAmount:{ type: Number, required: true },
  cgstAmount:   { type: Number, default: 0 },
  sgstAmount:   { type: Number, default: 0 },
  igstAmount:   { type: Number, default: 0 },
  totalTax:     { type: Number, default: 0 },
  totalAmount:  { type: Number, required: true },
  paidAmount:   { type: Number, default: 0 },
  balanceDue:   { type: Number },
  status:       { type: String, enum: ['draft','received','partial','paid','cancelled'], default: 'draft' },
  isIGST:       { type: Boolean, default: false },
  notes:        { type: String },
  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

purchaseSchema.pre('save', async function(next) {
  if (!this.billNumber) {
    const count = await mongoose.model('Purchase').countDocuments();
    const year  = new Date().getFullYear();
    this.billNumber = `BILL-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  this.balanceDue = this.totalAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
