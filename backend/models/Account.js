const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  code:      { type: String, required: true, unique: true, trim: true },
  name:      { type: String, required: true, trim: true },
  type:      { type: String, required: true, enum: ['asset','liability','equity','income','expense'] },
  group:     { type: String, required: true },
  parent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  isSystem:  { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
  balance:   { type: Number, default: 0 },
  description: { type: String }
}, { timestamps: true });

accountSchema.index({ code: 1 });
accountSchema.index({ type: 1 });

module.exports = mongoose.model('Account', accountSchema);
