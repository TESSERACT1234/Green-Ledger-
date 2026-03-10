const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename:    { type: String, required: true },
  originalName:{ type: String, required: true },
  mimetype:    { type: String },
  size:        { type: Number },
  path:        { type: String, required: true },
  entityType:  { type: String, enum: ['invoice','purchase','payment','journal','customer','vendor','other'] },
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  description: { type: String },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
