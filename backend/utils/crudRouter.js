// ── Generic CRUD factory ────────────────────────────────────────
const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');

function crudRouter(Model, adminWrite = false) {
  const router = express.Router();
  router.use(protect);

  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, search, isActive } = req.query;
      const filter = {};
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$or = [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { sku:   { $regex: search, $options: 'i' } }
        ];
      }
      const total = await Model.countDocuments(filter);
      const data  = await Model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
      res.json({ success: true, total, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true, data: doc });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.post('/', adminWrite ? adminOnly : (r,s,n)=>n(), async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  });

  router.put('/:id', adminWrite ? adminOnly : (r,s,n)=>n(), async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  });

  router.delete('/:id', adminOnly, async (req, res) => {
    try {
      await Model.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Deactivated.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  return router;
}

module.exports = crudRouter;
