const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  type:          { type: String, enum: ['receipt','payment'], required: true },
  partyType:     { type: String, enum: ['customer','vendor'], required: true },
  partyId:       { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'partyModel' },
  partyModel:    { type: String, enum: ['Customer','Vendor'] },
  partyName:     { type: String, required: true },
  bankAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  amount:        { type: Number, required: true, min: 0.01 },
  paymentDate:   { type: Date, required: true, default: Date.now },
  mode:          { type: String, enum: ['cash','bank','upi','cheque','neft','rtgs'], default: 'bank' },
  reference:     { type: String },
  description:   { type: String },
  allocations: [{
    invoiceId:  { type: mongoose.Schema.Types.ObjectId },
    invoiceNum: { type: String },
    amount:     { type: Number }
  }],
  journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

paymentSchema.pre('save', async function(next) {
  if (!this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    const year  = new Date().getFullYear();
    const prefix = this.type === 'receipt' ? 'RCP' : 'PMT';
    this.paymentNumber = `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
