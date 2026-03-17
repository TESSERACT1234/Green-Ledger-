const express      = require('express');
const router       = express.Router();
const BankAccount  = require('../models/BankAccount');
const { protect }  = require('../middleware/auth');

router.use(protect);

// ── GET all accounts ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = await BankAccount.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET recalculated balances from actual transactions ─────────
// MUST be before /:id
router.get('/recalculated', async (req, res) => {
  try {
    const Payment          = require('../models/Payment');
    const PartyTransaction = require('../models/PartyTransaction');

    const accounts = await BankAccount.find({});
    const MONEY_IN = ['receipt', 'capital_investment', 'director_loan'];

    const results = await Promise.all(accounts.map(async (acc) => {
      const [payments, partyTxns] = await Promise.all([
        Payment.find({ bankAccount: acc._id }),
        PartyTransaction.find({ bankAccountId: acc._id.toString() }),
      ]);

      const paymentSum = payments.reduce((s, p) =>
        s + (p.type === 'receipt' ? (p.amount||0) : -(p.amount||0)), 0);

      const partySum = partyTxns.reduce((s, t) =>
        s + (MONEY_IN.includes(t.type) ? (t.amount||0) : -(t.netAmount||t.amount||0)), 0);

      const calculatedBalance = +((acc.openingBalance||0) + paymentSum + partySum).toFixed(2);

      return {
        ...acc.toObject(),
        calculatedBalance,
      };
    }));

    res.json({ success: true, data: results });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── POST create ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const acc = await BankAccount.create({
      ...req.body,
      currentBalance: req.body.openingBalance || 0,
    });
    res.status(201).json({ success: true, data: acc });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// ── GET single ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const acc = await BankAccount.findById(req.params.id);
    res.json({ success: true, data: acc });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT update ────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const acc = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: acc });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// ── DELETE ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await BankAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;