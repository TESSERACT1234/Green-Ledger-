const mongoose = require('mongoose');

// ── Production Batch — one actual production run ───────────────
const productionBatchSchema = new mongoose.Schema({
  batchNumber:  { type: String, unique: true },
  bom:          { type: mongoose.Schema.Types.ObjectId, ref: 'BillOfMaterials', required: true },
  bomName:      { type: String },
  date:         { type: Date, required: true, default: Date.now },
  status:       { type: String, enum: ['planned','in_progress','completed','cancelled'], default: 'planned' },
  notes:        { type: String },

  // How many batches / scale factor
  batchMultiplier: { type: Number, default: 1 }, // 1 = standard batch, 2 = double batch etc

  // Inputs consumed (feedstocks)
  inputs: [{
    itemId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName:     { type: String },
    unit:         { type: String },
    expectedQty:  { type: Number },  // from BOM × multiplier
    actualQty:    { type: Number },  // what was actually used
    costPerUnit:  { type: Number },
    totalCost:    { type: Number },
  }],

  // Outputs produced
  outputs: [{
    itemId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName:     { type: String },
    unit:         { type: String },
    expectedQty:  { type: Number },  // from BOM × multiplier
    actualQty:    { type: Number },  // what was actually produced
    variance:     { type: Number },  // actualQty - expectedQty
    variancePct:  { type: Number },  // variance as %
  }],

  // Financials
  totalInputCost:   { type: Number, default: 0 },
  costPerLitre:     { type: Number, default: 0 }, // totalInputCost / main output qty
  efficiency:       { type: Number, default: 0 }, // actual main output / expected × 100

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

productionBatchSchema.pre('save', async function(next) {
  if (!this.batchNumber) {
    const count = await mongoose.model('ProductionBatch').countDocuments();
    const year  = new Date().getFullYear();
    this.batchNumber = `BATCH-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ProductionBatch', productionBatchSchema);