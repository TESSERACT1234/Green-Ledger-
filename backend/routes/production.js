const express = require('express');
const router  = express.Router();
const BOM     = require('../models/BillOfMaterials');
const Batch   = require('../models/ProductionBatch');
const Item    = require('../models/Item');
const { protect } = require('../middleware/auth');

router.use(protect);

// ══ BILL OF MATERIALS ══════════════════════════════════════════

// GET all BOMs
router.get('/bom', async (req, res) => {
  try {
    const data = await BOM.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create BOM
router.post('/bom', async (req, res) => {
  try {
    const bom = await BOM.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: bom });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// PUT update BOM
router.put('/bom/:id', async (req, res) => {
  try {
    const bom = await BOM.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: bom });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// GET calculate — given feedstock quantities, how much output?
router.post('/bom/:id/calculate', async (req, res) => {
  try {
    const bom = await BOM.findById(req.params.id);
    if (!bom) return res.status(404).json({ success: false, message: 'BOM not found' });

    const { inputQuantities } = req.body; // { itemId: actualQty }

    // Find the limiting factor — which input has the least coverage
    let minMultiplier = Infinity;
    bom.inputs.forEach(inp => {
      const available = inputQuantities?.[inp.itemId.toString()] ?? inp.quantity;
      const ratio = available / inp.quantity;
      if (ratio < minMultiplier) minMultiplier = ratio;
    });
    if (minMultiplier === Infinity) minMultiplier = 1;

    const result = {
      batchMultiplier: minMultiplier,
      inputs: bom.inputs.map(inp => ({
        itemId:      inp.itemId,
        itemName:    inp.itemName,
        unit:        inp.unit,
        required:    +(inp.quantity * minMultiplier).toFixed(2),
        available:   inputQuantities?.[inp.itemId.toString()] ?? inp.quantity,
      })),
      outputs: bom.outputs.map(out => ({
        itemId:        out.itemId,
        itemName:      out.itemName,
        unit:          out.unit,
        expectedQty:   +(out.quantity * minMultiplier).toFixed(2),
        isMainProduct: out.isMainProduct,
      })),
    };

    res.json({ success: true, data: result });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══ PRODUCTION BATCHES ═════════════════════════════════════════

// GET all batches
router.get('/batches', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const total  = await Batch.countDocuments(filter);
    const data   = await Batch.find(filter).sort({ date: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, data });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create batch (planned from BOM)
router.post('/batches', async (req, res) => {
  try {
    const { bomId, batchMultiplier = 1, date, notes } = req.body;
    const bom = await BOM.findById(bomId);
    if (!bom) return res.status(404).json({ success: false, message: 'BOM not found' });

    // Get latest purchase prices for inputs
    const inputs = await Promise.all(bom.inputs.map(async inp => {
      const item = await Item.findById(inp.itemId);
      return {
        itemId:      inp.itemId,
        itemName:    inp.itemName,
        unit:        inp.unit,
        expectedQty: +(inp.quantity * batchMultiplier).toFixed(2),
        actualQty:   +(inp.quantity * batchMultiplier).toFixed(2), // default = expected
        costPerUnit: item?.purchasePrice || inp.costPerUnit || 0,
        totalCost:   +((item?.purchasePrice || 0) * inp.quantity * batchMultiplier).toFixed(2),
      };
    }));

    const outputs = bom.outputs.map(out => ({
      itemId:      out.itemId,
      itemName:    out.itemName,
      unit:        out.unit,
      expectedQty: +(out.quantity * batchMultiplier).toFixed(2),
      actualQty:   null, // filled when batch completes
      variance:    null,
      variancePct: null,
    }));

    const totalInputCost = inputs.reduce((s, i) => s + (i.totalCost || 0), 0);
    const mainOutput     = outputs.find(o => bom.outputs.find(b => b.itemId.equals(o.itemId) && b.isMainProduct));
    const costPerLitre   = mainOutput?.expectedQty ? +(totalInputCost / mainOutput.expectedQty).toFixed(2) : 0;

    const batch = await Batch.create({
      bom: bomId, bomName: bom.name, date, notes,
      batchMultiplier, inputs, outputs,
      totalInputCost, costPerLitre,
      status: 'planned',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: batch });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// GET single batch
router.get('/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    res.json({ success: true, data: batch });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// PATCH complete a batch — record actual quantities + update stock
router.patch('/batches/:id/complete', async (req, res) => {
  try {
    const { actualOutputs, actualInputs } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    // Calculate variances for outputs
    const outputs = batch.outputs.map(out => {
      const actual      = actualOutputs?.[out.itemId.toString()] ?? out.expectedQty;
      const variance    = +(actual - out.expectedQty).toFixed(2);
      const variancePct = out.expectedQty ? +((variance / out.expectedQty) * 100).toFixed(1) : 0;
      return { ...out.toObject(), actualQty: actual, variance, variancePct };
    });

    // Update actual inputs if provided
    const inputs = batch.inputs.map(inp => {
      const actual    = actualInputs?.[inp.itemId.toString()] ?? inp.expectedQty;
      const totalCost = +(actual * (inp.costPerUnit || 0)).toFixed(2);
      return { ...inp.toObject(), actualQty: actual, totalCost };
    });

    const totalInputCost = inputs.reduce((s, i) => s + (i.totalCost || 0), 0);
    const mainOut        = outputs.find(o => o.actualQty != null);
    const costPerLitre   = mainOut?.actualQty ? +(totalInputCost / mainOut.actualQty).toFixed(2) : 0;
    const efficiency     = mainOut ? +((mainOut.actualQty / mainOut.expectedQty) * 100).toFixed(1) : 0;

    // Update stock — increase output items
    for (const out of outputs) {
      if (out.itemId && out.actualQty) {
        await Item.findByIdAndUpdate(out.itemId, { $inc: { currentStock: out.actualQty } });
      }
    }
    // Decrease input items (consumed)
    for (const inp of inputs) {
      if (inp.itemId && inp.actualQty) {
        await Item.findByIdAndUpdate(inp.itemId, { $inc: { currentStock: -inp.actualQty } });
      }
    }

    const updated = await Batch.findByIdAndUpdate(req.params.id, {
      outputs, inputs, totalInputCost, costPerLitre, efficiency, status: 'completed'
    }, { new: true });

    res.json({ success: true, data: updated });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// GET summary stats
router.get('/summary', async (req, res) => {
  try {
    const [total, completed, planned, inProgress] = await Promise.all([
      Batch.countDocuments(),
      Batch.countDocuments({ status: 'completed' }),
      Batch.countDocuments({ status: 'planned' }),
      Batch.countDocuments({ status: 'in_progress' }),
    ]);
    const recentBatches = await Batch.find({ status: 'completed' }).sort({ date: -1 }).limit(5);
    const avgEfficiency = recentBatches.length
      ? +(recentBatches.reduce((s, b) => s + (b.efficiency || 0), 0) / recentBatches.length).toFixed(1)
      : 0;
    res.json({ success: true, data: { total, completed, planned, inProgress, avgEfficiency } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;