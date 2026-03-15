const Party = require('../models/Party');
const PartyTransaction = require('../models/PartyTransaction');

// ── GET all parties (optionally filtered by type) ──────────────
exports.getParties = async (req, res) => {
  try {
    const { type, search, isActive, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (type)     filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name:       { $regex: search, $options: 'i' } },
        { code:       { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Party.countDocuments(filter);
    const data  = await Party.find(filter)
      .sort({ type: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, total, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── GET single party ───────────────────────────────────────────
exports.getParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });

    const transactions = await PartyTransaction.find({ party: party._id })
      .sort({ date: -1 }).limit(20)
      .populate('createdBy', 'name');

    const summary = await PartyTransaction.aggregate([
      { $match: { party: party._id, status: 'paid' } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({ success: true, data: party, transactions, summary });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CREATE party ───────────────────────────────────────────────
exports.createParty = async (req, res) => {
  try {
    const party = await Party.create(req.body);
    res.status(201).json({ success: true, data: party });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// ── UPDATE party ───────────────────────────────────────────────
exports.updateParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });
    res.json({ success: true, data: party });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// ── DEACTIVATE party ───────────────────────────────────────────
exports.deleteParty = async (req, res) => {
  try {
    await Party.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Party deactivated.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── GET transactions for a party ──────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const { from, to, type, page = 1, limit = 50 } = req.query;
    const filter = { party: req.params.id };
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }
    const total = await PartyTransaction.countDocuments(filter);
    const data  = await PartyTransaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('createdBy', 'name');
    res.json({ success: true, total, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CREATE transaction ────────────────────────────────────────
exports.createTransaction = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });

    const txn = await PartyTransaction.create({
      ...req.body,
      party:     party._id,
      partyType: party.type,
      partyName: party.name,
      createdBy: req.user._id
    });

    // Update running balances on Party
    const inc = {};
    if (txn.type === 'advance_given')       inc.advanceBalance     =  txn.amount;
    if (txn.type === 'advance_recovery')    inc.advanceBalance     = -txn.amount;
    if (txn.type === 'drawings')            inc.drawingsAccount    =  txn.amount;
    if (txn.type === 'capital_investment')  inc.capitalContributed =  txn.amount;
    if (txn.type === 'director_loan')     { inc.loanGiven          =  txn.amount; inc.loanOutstanding =  txn.amount; }
    if (txn.type === 'loan_repayment')    { inc.loanRepaid         =  txn.amount; inc.loanOutstanding = -txn.amount; }

    const isMoneyIn = ['capital_investment','director_loan'].includes(txn.type);
    inc.totalPaid = isMoneyIn ? 0 : (txn.netAmount || txn.amount);

    await Party.findByIdAndUpdate(party._id, {
      $inc: inc,
      $set: { lastTransactionDate: txn.date }
    });

    // Update BankAccount balance if bankAccountId provided
    if (txn.bankAccountId) {
      const BankAccount = require('../models/BankAccount');
      // isMoneyIn = capital_investment / director_loan → bank goes UP
      // everything else (salary, drawings, contractor, expense etc.) → bank goes DOWN
      const bankInc = isMoneyIn ? txn.amount : -(txn.netAmount || txn.amount);
      await BankAccount.findByIdAndUpdate(txn.bankAccountId, { $inc: { currentBalance: bankInc } });
    }

    res.status(201).json({ success: true, data: txn });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

// ── SUMMARY stats across all parties ─────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const [counts, salaryThisMonth, totalDrawings, expenseThisMonth, directorStats] = await Promise.all([
      Party.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }
      ]),
      PartyTransaction.aggregate([
        { $match: { type: 'salary_payment', status: 'paid', month: new Date().toISOString().slice(0,7) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PartyTransaction.aggregate([
        { $match: { type: 'drawings', status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PartyTransaction.aggregate([
        { $match: { type: 'expense_payment', status: 'paid',
            date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Party.aggregate([
        { $match: { type: 'director' } },
        { $group: { _id: null, totalCapital: { $sum: '$capitalContributed' }, totalLoanOutstanding: { $sum: '$loanOutstanding' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        counts,
        salaryThisMonth:      salaryThisMonth[0]?.total || 0,
        totalDrawings:        totalDrawings[0]?.total || 0,
        expenseThisMonth:     expenseThisMonth[0]?.total || 0,
        totalCapital:         directorStats[0]?.totalCapital || 0,
        totalLoanOutstanding: directorStats[0]?.totalLoanOutstanding || 0,
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── DELETE party transaction — reverse party balances + bank ──
exports.deleteTransaction = async (req, res) => {
  try {
    const PartyTransaction = require('../models/PartyTransaction');
    const BankAccount      = require('../models/BankAccount');

    const txn = await PartyTransaction.findById(req.params.txnId);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    // Reverse party balance fields
    const inc = {};
    if (txn.type === 'capital_investment') inc.capitalContributed = -txn.amount;
    if (txn.type === 'director_loan')      { inc.loanGiven = -txn.amount; inc.loanOutstanding = -txn.amount; }
    if (txn.type === 'loan_repayment')     { inc.loanRepaid = -txn.amount; inc.loanOutstanding = txn.amount; }
    if (txn.type === 'drawings')           inc.drawingsAccount = -txn.amount;
    if (txn.type === 'salary_payment')     inc.totalSalaryPaid = -(txn.amount || 0);
    if (txn.type === 'advance_given')      inc.advanceOutstanding = -(txn.amount || 0);
    if (txn.type === 'advance_recovery')   inc.advanceOutstanding = (txn.amount || 0);

    if (Object.keys(inc).length > 0) {
      await Party.findByIdAndUpdate(req.params.id, { $inc: inc });
    }

    // Reverse bank balance
    if (txn.bankAccountId) {
      const isMoneyIn = ['capital_investment','director_loan'].includes(txn.type);
      const delta     = isMoneyIn ? -(txn.amount) : (txn.netAmount || txn.amount);
      await BankAccount.findByIdAndUpdate(txn.bankAccountId, { $inc: { currentBalance: delta } });
    }

    await PartyTransaction.findByIdAndDelete(req.params.txnId);
    res.json({ success: true, message: 'Transaction deleted and balances reversed.' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};