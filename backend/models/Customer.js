const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, trim: true },
  phone:          { type: String, trim: true },
  gstin:          { type: String, trim: true, uppercase: true },
  stateCode:      { type: String },
  stateName:      { type: String },
  billingAddress: {
    line1:   String,
    line2:   String,
    city:    String,
    state:   String,
    pincode: String
  },
  openingBalance: { type: Number, default: 0 },
  creditLimit:    { type: Number, default: 0 },
  paymentTerms:   { type: Number, default: 30 },
  isActive:       { type: Boolean, default: true },
  notes:          { type: String }
}, { timestamps: true });

customerSchema.index({ name: 1 });
customerSchema.index({ gstin: 1 });

module.exports = mongoose.model('Customer', customerSchema);
