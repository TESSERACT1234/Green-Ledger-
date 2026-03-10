const express  = require('express');
const router   = express.Router();
const Purchase = require('../models/Purchase');
const Item     = require('../models/Item');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const total  = await Purchase.countDocuments(filter);
  const data   = await Purchase.find(filter).populate('vendor','name gstin').sort({ billDate: -1 }).skip((page-1)*limit).limit(Number(limit));
  res.json({ success: true, total, data });
});
router.post('/', async (req, res) => {
  try {
    const bill = await Purchase.create({ ...req.body, createdBy: req.user._id });
    // Update stock
    for (const li of req.body.lineItems || []) {
      await Item.findByIdAndUpdate(li.item, { $inc: { currentStock: li.qty } });
    }
    res.status(201).json({ success: true, data: bill });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});
router.get('/:id', async (req, res) => {
  const bill = await Purchase.findById(req.params.id).populate('vendor').populate('createdBy','name');
  res.json({ success: true, data: bill });
});
router.put('/:id', async (req, res) => {
  try {
    const bill = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: bill });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});
module.exports = router;
