const Invoice  = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Payment  = require('../models/Payment');
const Customer = require('../models/Customer');
const Item     = require('../models/Item');

// @GET /api/v1/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      revenueThis, revenueLast,
      expenseThis, expenseLast,
      outstandingInvoices,
      recentInvoices,
      recentPayments,
      lowStockItems,
      customerCount,
      salesByMonth
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Purchase.aggregate([
        { $match: { billDate: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Purchase.aggregate([
        { $match: { billDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['sent','partial','overdue'] } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$balanceDue' } } }
      ]),
      Invoice.find({ status: { $ne: 'cancelled' } })
        .populate('customer', 'name')
        .sort({ createdAt: -1 }).limit(5)
        .select('invoiceNumber customerName totalAmount status invoiceDate'),
      Payment.find()
        .sort({ createdAt: -1 }).limit(5)
        .select('paymentNumber partyName amount type paymentDate mode'),
      Item.find({ isActive: true, type: 'product', $expr: { $lte: ['$currentStock', '$reorderLevel'] } })
        .select('sku name currentStock reorderLevel unit').limit(5),
      Customer.countDocuments({ isActive: true }),
      Invoice.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: {
          _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
          revenue: { $sum: '$totalAmount' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 6 }
      ])
    ]);

    const revenue      = revenueThis[0]?.total || 0;
    const lastRevenue  = revenueLast[0]?.total || 0;
    const expenses     = expenseThis[0]?.total || 0;
    const lastExpenses = expenseLast[0]?.total || 0;

    res.json({
      success: true,
      data: {
        kpis: {
          revenue:        Math.round(revenue),
          revenueGrowth:  lastRevenue ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : 0,
          expenses:       Math.round(expenses),
          expenseGrowth:  lastExpenses ? Math.round(((expenses - lastExpenses) / lastExpenses) * 100) : 0,
          profit:         Math.round(revenue - expenses),
          outstanding:    Math.round(outstandingInvoices[0]?.total || 0),
          outstandingCount: outstandingInvoices[0]?.count || 0,
          customerCount
        },
        recentInvoices,
        recentPayments,
        lowStockItems,
        salesByMonth: salesByMonth.map(m => ({
          month:   `${m._id.year}-${String(m._id.month).padStart(2,'0')}`,
          revenue: Math.round(m.revenue)
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
