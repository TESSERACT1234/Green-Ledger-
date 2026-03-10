const express     = require('express');
const router      = express.Router();
const Payment     = require('../models/Payment');
const BankAccount = require('../models/BankAccount');
const Invoice     = require('../models/Invoice');
const Purchase    = require('../models/Purchase');
const { protect } = require('../middleware/auth');

router.use(protect);

// ── GET /payments ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, partyId, from, to, page = 1, limit = 200 } = req.query;
    const filter = {};
    if (type)    filter.type = type;
    if (partyId) filter.partyId = partyId;
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to)   filter.paymentDate.$lte = new Date(to);
    }
    const total = await Payment.countDocuments(filter);
    const data  = await Payment.find(filter).sort({ paymentDate: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, data });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /payments/pending — unpaid invoices + bills ────────────
// MUST be before /:id so Express doesn't match "pending" as an id
router.get('/pending', async (req, res) => {
  try {
    const [invoices, purchases] = await Promise.all([
      Invoice.find({ status: { $in: ['sent','partial','overdue','draft'] }, balanceDue: { $gt: 0 } })
        .sort({ invoiceDate: 1 }).limit(100),
      Purchase.find({ status: { $in: ['draft','received','partial'] }, balanceDue: { $gt: 0 } })
        .sort({ billDate: 1 }).limit(100),
    ]);

    const pending = [
      ...invoices.map(inv => ({
        _id:         inv._id,
        source:      'invoice',
        ref:         inv.invoiceNumber,
        partyName:   inv.customerName,
        partyId:     inv.customer,
        partyType:   'customer',
        date:        inv.invoiceDate,
        dueDate:     inv.dueDate,
        totalAmount: inv.totalAmount,
        paidAmount:  inv.paidAmount || 0,
        balanceDue:  inv.balanceDue,
        status:      inv.status,
        direction:   'in',
      })),
      ...purchases.map(pur => ({
        _id:         pur._id,
        source:      'purchase',
        ref:         pur.billNumber,
        partyName:   pur.vendorName,
        partyId:     pur.vendor,
        partyType:   'vendor',
        date:        pur.billDate,
        dueDate:     pur.dueDate,
        totalAmount: pur.totalAmount,
        paidAmount:  pur.paidAmount || 0,
        balanceDue:  pur.balanceDue,
        status:      pur.status,
        direction:   'out',
      })),
    ].sort((a, b) => new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date));

    res.json({ success: true, data: pending });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST /payments/settle — confirm payment for invoice or bill ─
router.post('/settle', async (req, res) => {
  try {
    const { sourceId, source, amount, bankAccountId, mode, reference, date, partyName, partyId, partyType } = req.body;

    const payType = source === 'invoice' ? 'receipt' : 'payment';
    const pay = await Payment.create({
      type:        payType,
      partyType,
      partyId,
      partyName,
      partyModel:  partyType === 'customer' ? 'Customer' : 'Vendor',
      amount:      +amount,
      paymentDate: date || new Date(),
      mode:        mode || 'bank',
      reference,
      bankAccount: bankAccountId || undefined,
      createdBy:   req.user._id,
    });

    // Update invoice/purchase paid amount + status
    if (source === 'invoice') {
      const inv = await Invoice.findById(sourceId);
      if (inv) {
        const newPaid   = (inv.paidAmount || 0) + +amount;
        const newStatus = newPaid >= inv.totalAmount ? 'paid' : 'partial';
        await Invoice.findByIdAndUpdate(sourceId, {
          paidAmount: newPaid,
          balanceDue: Math.max(0, inv.totalAmount - newPaid),
          status:     newStatus,
        });
      }
    } else {
      const pur = await Purchase.findById(sourceId);
      if (pur) {
        const newPaid   = (pur.paidAmount || 0) + +amount;
        const newStatus = newPaid >= pur.totalAmount ? 'paid' : 'partial';
        await Purchase.findByIdAndUpdate(sourceId, {
          paidAmount: newPaid,
          balanceDue: Math.max(0, pur.totalAmount - newPaid),
          status:     newStatus,
        });
      }
    }

    // Update bank balance
    if (bankAccountId) {
      const delta = source === 'invoice' ? +amount : -amount;
      await BankAccount.findByIdAndUpdate(bankAccountId, { $inc: { currentBalance: delta } });
    }

    res.status(201).json({ success: true, data: pay });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// ── POST /payments ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { bankAccountId, ...rest } = req.body;
    const pay = await Payment.create({
      ...rest,
      bankAccount: bankAccountId || undefined,
      createdBy:   req.user._id,
    });
    if (bankAccountId) {
      const delta = pay.type === 'receipt' ? pay.amount : -pay.amount;
      await BankAccount.findByIdAndUpdate(bankAccountId, { $inc: { currentBalance: delta } });
    }
    res.status(201).json({ success: true, data: pay });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// ── GET /payments/:id — MUST be last ──────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pay = await Payment.findById(req.params.id);
    res.json({ success: true, data: pay });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;