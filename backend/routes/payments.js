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
    const { type, partyId, bankAccount, from, to, page = 1, limit = 200 } = req.query;
    const filter = {};
    if (type)        filter.type = type;
    if (partyId)     filter.partyId = partyId;
    if (bankAccount) filter.bankAccount = bankAccount;
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

// ── GET /payments/bank-statement — all txns for a bank account ─
router.get('/bank-statement', async (req, res) => {
  try {
    const { bankAccountId, from, to } = req.query;
    if (!bankAccountId) return res.status(400).json({ success: false, message: 'bankAccountId required' });

    const PartyTransaction = require('../models/PartyTransaction');
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    const paymentFilter = { bankAccount: bankAccountId };
    const partyFilter   = { bankAccountId };
    if (from || to) {
      paymentFilter.paymentDate  = dateFilter;
      partyFilter.date           = dateFilter;
    }

    // Fetch from both collections
    const [payments, partyTxns] = await Promise.all([
      Payment.find(paymentFilter).sort({ paymentDate: -1 }).limit(1000),
      PartyTransaction.find(partyFilter).sort({ date: -1 }).limit(1000),
    ]);

    // Normalise to common shape
    const TXN_LABELS = {
      receipt:'Receipt', payment:'Payment',
      capital_investment:'Capital Investment', director_loan:'Director Loan',
      loan_repayment:'Loan Repayment', drawings:'Drawings', profit_share:'Profit Share',
      salary_payment:'Salary Payment', advance_given:'Advance Given',
      advance_recovery:'Advance Recovery', contractor_payment:'Contractor Payment',
      expense_payment:'Expense Payment', reimbursement:'Reimbursement',
      tds_deduction:'TDS Deduction',
    };

    const MONEY_IN = ['receipt','capital_investment','director_loan'];

    // Fetch party names for party transactions
    const Party    = require('../models/Party');
    const partyIds = [...new Set(partyTxns.map(t => t.party?.toString()).filter(Boolean))];
    const parties  = partyIds.length ? await Party.find({ _id: { $in: partyIds } }, 'name type') : [];
    const partyMap = {};
    parties.forEach(p => { partyMap[p._id.toString()] = p.name; });

    const rows = [
      ...payments.map(p => ({
        _id:         p._id,
        date:        p.paymentDate || p.createdAt,
        ref:         p.paymentNumber,
        description: TXN_LABELS[p.type] || p.type,
        partyName:   p.partyName || '',
        type:        p.type,
        amount:      p.amount,
        isIn:        p.type === 'receipt',
        mode:        p.mode,
        source:      'payment',
      })),
      ...partyTxns.map(t => ({
        _id:         t._id,
        date:        t.date || t.createdAt,
        ref:         t.reference || t._id.toString().slice(-6).toUpperCase(),
        description: TXN_LABELS[t.type] || t.type,
        partyName:   partyMap[t.party?.toString()] || '',
        type:        t.type,
        amount:      t.netAmount || t.amount,
        isIn:        MONEY_IN.includes(t.type),
        mode:        t.paymentMode,
        source:      'party',
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /payments/:id — MUST be last ──────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pay = await Payment.findById(req.params.id);
    res.json({ success: true, data: pay });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

// ── PUT /payments/:id — edit a payment ────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const old = await Payment.findById(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Payment not found' });

    const { bankAccountId, amount, type, ...rest } = req.body;

    // Reverse old bank effect
    if (old.bankAccount) {
      const oldDelta = old.type === 'receipt' ? -old.amount : old.amount;
      await BankAccount.findByIdAndUpdate(old.bankAccount, { $inc: { currentBalance: oldDelta } });
    }

    // Apply new bank effect
    const newBankId = bankAccountId || old.bankAccount;
    const newAmount = amount || old.amount;
    const newType   = type || old.type;
    if (newBankId) {
      const newDelta = newType === 'receipt' ? newAmount : -newAmount;
      await BankAccount.findByIdAndUpdate(newBankId, { $inc: { currentBalance: newDelta } });
    }

    const updated = await Payment.findByIdAndUpdate(req.params.id, {
      ...rest,
      amount: newAmount,
      type:   newType,
      bankAccount: newBankId,
    }, { new: true });

    res.json({ success: true, data: updated });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

// ── DELETE /payments/:id — delete + reverse bank balance ──────
router.delete('/:id', async (req, res) => {
  try {
    const pay = await Payment.findById(req.params.id);
    if (!pay) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Reverse bank balance
    if (pay.bankAccount) {
      const delta = pay.type === 'receipt' ? -pay.amount : pay.amount;
      await BankAccount.findByIdAndUpdate(pay.bankAccount, { $inc: { currentBalance: delta } });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Payment deleted and bank balance reversed.' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});