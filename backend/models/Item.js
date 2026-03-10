const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  sku:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:          { type: String, required: true, trim: true },
  description:   { type: String },
  hsnCode:       { type: String, trim: true },
  unit:          { type: String, enum: ['pcs','kg','lt','box','ltr','mtr','ton'], default: 'pcs' },
  salePrice:     { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 },
  gstRate:       { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },
  currentStock:  { type: Number, default: 0 },
  reorderLevel:  { type: Number, default: 10 },
  openingStock:  { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
  category:      { type: String },
  type:          { type: String, enum: ['product','service'], default: 'product' }
}, { timestamps: true });

itemSchema.index({ sku: 1 });
itemSchema.index({ name: 1 });

module.exports = mongoose.model('Item', itemSchema);
