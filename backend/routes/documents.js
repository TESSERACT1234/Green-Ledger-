const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const doc = await Document.create({
      filename:     req.file.filename,
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      path:         `/uploads/${req.file.filename}`,
      entityType:   req.body.entityType,
      entityId:     req.body.entityId,
      description:  req.body.description,
      uploadedBy:   req.user._id
    });
    res.status(201).json({ success: true, data: doc });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});
router.get('/', async (req, res) => {
  const { entityType, entityId } = req.query;
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId)   filter.entityId   = entityId;
  const docs = await Document.find(filter).populate('uploadedBy','name').sort({ createdAt: -1 });
  res.json({ success: true, data: docs });
});
module.exports = router;
