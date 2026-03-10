const mongoose = require('mongoose');

// ── Bill of Materials — the "recipe" for one batch ────────────
const bomSchema = new mongoose.Schema({
  name:        { type: String, required: true },  // e.g. "Standard Biodiesel Batch"
  description: { type: String },
  batchSize:   { type: Number, required: true },  // e.g. 1000 (litres of biodiesel)
  batchUnit:   { type: String, default: 'litres' },
  isActive:    { type: Boolean, default: true },

  // Feedstocks (inputs) — what you buy/consume
  inputs: [{
    itemId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },  // per batch
    unit:     { type: String, required: true },
    costPerUnit: { type: Number, default: 0 },   // auto-filled from last purchase price
  }],

  // Products (outputs) — what gets produced
  outputs: [{
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName:    { type: String, required: true },
    quantity:    { type: Number, required: true },  // expected per batch
    unit:        { type: String, required: true },
    isMainProduct: { type: Boolean, default: false }, // true = Biodiesel, false = Glycerine etc
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('BillOfMaterials', bomSchema);