const JournalEntry = require('../models/JournalEntry');
const Invoice      = require('../models/Invoice');
const Purchase     = require('../models/Purchase');
const Account      = require('../models/Account');
const Payment      = require('../models/Payment');
const Item         = require('../models/Item');

// @GET /api/v1/reports/trial-balance
exports.trialBalance = async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true }).sort('code');
    const entries  = await JournalEntry.find({ status: 'posted' });
    
    const balances = {};
    accounts.forEach(a => { balances[a._id] = { debit: 0, credit: 0 }; });
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (balances[line.account]) {
          balances[line.account].debit  += line.debit;
          balances[line.account].credit += line.credit;
        }
      });
    });

    const rows = accounts.map(a => ({
      code:      a.code,
      name:      a.name,
      type:      a.type,
      group:     a.group,
      debit:     Math.round((balances[a._id]?.debit || 0) * 100) / 100,
      credit:    Math.round((balances[a._id]?.credit || 0) * 100) / 100,
      balance:   Math.round(((balances[a._id]?.debit || 0) - (balances[a._id]?.credit || 0)) * 100) / 100
    })).filter(r => r.debit !== 0 || r.credit !== 0);

    const totalDebit  = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    res.json({ success: true, data: { rows, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/reports/profit-loss?from=&to=
exports.profitLoss = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    const invoiceFilter = from || to ? { invoiceDate: dateFilter, status: { $ne: 'cancelled' } } : { status: { $ne: 'cancelled' } };
    const purchaseFilter = from || to ? { billDate: dateFilter, status: { $ne: 'cancelled' } } : { status: { $ne: 'cancelled' } };

    const [salesResult] = await Invoice.aggregate([
      { $match: invoiceFilter },
      { $group: { _id: null, total: { $sum: '$taxableAmount' }, tax: { $sum: '$totalTax' }, grand: { $sum: '$totalAmount' } } }
    ]);
    const [purchaseResult] = await Purchase.aggregate([
      { $match: purchaseFilter },
      { $group: { _id: null, total: { $sum: '$taxableAmount' }, tax: { $sum: '$totalTax' }, grand: { $sum: '$totalAmount' } } }
    ]);

    const revenue  = salesResult?.total || 0;
    const cogs     = purchaseResult?.total || 0;
    const grossProfit = revenue - cogs;
    const netProfit   = grossProfit; // extend with expense accounts as needed

    res.json({
      success: true,
      data: {
        period: { from, to },
        revenue:      Math.round(revenue * 100) / 100,
        cogs:         Math.round(cogs * 100) / 100,
        grossProfit:  Math.round(grossProfit * 100) / 100,
        expenses:     0,
        netProfit:    Math.round(netProfit * 100) / 100,
        salesTax:     Math.round((salesResult?.tax || 0) * 100) / 100,
        purchaseTax:  Math.round((purchaseResult?.tax || 0) * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/reports/customer-outstanding
exports.customerOutstanding = async (req, res) => {
  try {
    const outstanding = await Invoice.aggregate([
      { $match: { status: { $in: ['sent','partial','overdue'] } } },
      { $group: {
        _id: '$customer',
        customerName: { $first: '$customerName' },
        totalAmount:  { $sum: '$totalAmount' },
        paidAmount:   { $sum: '$paidAmount' },
        balance:      { $sum: '$balanceDue' },
        invoiceCount: { $sum: 1 }
      }},
      { $sort: { balance: -1 } }
    ]);
    res.json({ success: true, data: outstanding });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/reports/gst-summary?from=&to=
exports.gstSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    const filter = { status: { $ne: 'cancelled' } };
    if (from || to) filter.invoiceDate = dateFilter;

    const [output] = await Invoice.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        taxableAmount: { $sum: '$taxableAmount' },
        cgstCollected: { $sum: '$cgstAmount' },
        sgstCollected: { $sum: '$sgstAmount' },
        igstCollected: { $sum: '$igstAmount' },
        totalTax:      { $sum: '$totalTax' }
      }}
    ]);

    const purchaseFilter = { status: { $ne: 'cancelled' } };
    if (from || to) purchaseFilter.billDate = dateFilter;
    const [input] = await Purchase.aggregate([
      { $match: purchaseFilter },
      { $group: {
        _id: null,
        cgstPaid: { $sum: '$cgstAmount' },
        sgstPaid: { $sum: '$sgstAmount' },
        igstPaid: { $sum: '$igstAmount' },
        totalPaid:{ $sum: '$totalTax' }
      }}
    ]);

    res.json({
      success: true,
      data: {
        outputTax:   output || {},
        inputCredit: input || {},
        netLiability: {
          cgst: ((output?.cgstCollected || 0) - (input?.cgstPaid || 0)),
          sgst: ((output?.sgstCollected || 0) - (input?.sgstPaid || 0)),
          igst: ((output?.igstCollected || 0) - (input?.igstPaid || 0)),
          total: ((output?.totalTax || 0) - (input?.totalPaid || 0))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/reports/stock-summary
exports.stockSummary = async (req, res) => {
  try {
    const items = await Item.find({ isActive: true, type: 'product' })
      .select('sku name unit currentStock reorderLevel purchasePrice salePrice');
    const data = items.map(i => ({
      ...i.toObject(),
      stockValue:  Math.round(i.currentStock * i.purchasePrice * 100) / 100,
      isLowStock:  i.currentStock <= i.reorderLevel
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
