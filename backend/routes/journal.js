const crudRouter    = require('../utils/crudRouter');
const JournalEntry  = require('../models/JournalEntry');
const express       = require('express');
const router        = express.Router();
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', async (req, res) => {
  const data = await JournalEntry.find().sort({ createdAt: -1 }).limit(50).populate('createdBy','name');
  res.json({ success: true, data });
});
router.post('/', async (req, res) => {
  try {
    const entry = await JournalEntry.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: entry });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});
router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const entry = await JournalEntry.findByIdAndUpdate(req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    res.json({ success: true, data: entry });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});
router.get('/:id', async (req, res) => {
  const entry = await JournalEntry.findById(req.params.id).populate('createdBy','name').populate('approvedBy','name');
  res.json({ success: true, data: entry });
});
module.exports = router;
