const Invoice = require('../models/Invoice');
const Item    = require('../models/Item');

// GST routing: if customer state == org state → CGST+SGST, else IGST
// Tesseract Flex Fuel is in Gujarat → state code 24
const ORG_STATE_CODE = '24';

function calculateGST(lineItems, customerStateCode) {
  const isIGST = customerStateCode && customerStateCode !== ORG_STATE_CODE;
  let subtotal = 0, taxableAmount = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  const processed = lineItems.map(item => {
    const qty         = Number(item.qty);
    const rate        = Number(item.rate);
    const discount    = Number(item.discount || 0);
    const taxableAmt  = (qty * rate) - discount;
    const gstRate     = Number(item.gstRate || 18);

    subtotal      += qty * rate;
    taxableAmount += taxableAmt;

    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
    if (isIGST) {
      igstAmt = (taxableAmt * gstRate) / 100;
      igstAmount += igstAmt;
    } else {
      cgstAmt = (taxableAmt * (gstRate / 2)) / 100;
      sgstAmt = (taxableAmt * (gstRate / 2)) / 100;
      cgstAmount += cgstAmt;
      sgstAmount += sgstAmt;
    }

    return {
      ...item,
      taxableAmt: Math.round(taxableAmt * 100) / 100,
      cgstRate: isIGST ? 0 : gstRate / 2,
      sgstRate: isIGST ? 0 : gstRate / 2,
      igstRate: isIGST ? gstRate : 0,
      cgstAmt:  Math.round(cgstAmt * 100) / 100,
      sgstAmt:  Math.round(sgstAmt * 100) / 100,
      igstAmt:  Math.round(igstAmt * 100) / 100,
      totalAmt: Math.round((taxableAmt + cgstAmt + sgstAmt + igstAmt) * 100) / 100
    };
  });

  const totalTax    = cgstAmount + sgstAmount + igstAmount;
  const totalAmount = taxableAmount + totalTax;

  return {
    processed, isIGST,
    subtotal:      Math.round(subtotal * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgstAmount:    Math.round(cgstAmount * 100) / 100,
    sgstAmount:    Math.round(sgstAmount * 100) / 100,
    igstAmount:    Math.round(igstAmount * 100) / 100,
    totalTax:      Math.round(totalTax * 100) / 100,
    totalAmount:   Math.round(totalAmount * 100) / 100
  };
}

// @GET /api/v1/invoices
exports.getInvoices = async (req, res) => {
  try {
    const { status, customer, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status = status;
    if (customer) filter.customer = customer;
    if (from || to) {
      filter.invoiceDate = {};
      if (from) filter.invoiceDate.$gte = new Date(from);
      if (to)   filter.invoiceDate.$lte = new Date(to);
    }
    const total    = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('customer', 'name email gstin stateCode')
      .populate('createdBy', 'name')
      .sort({ invoiceDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/invoices
exports.createInvoice = async (req, res) => {
  try {
    const { customer: customerData, lineItems, invoiceDate, dueDate, notes, terms } = req.body;
    const { processed, ...totals } = calculateGST(lineItems, customerData.stateCode);

    const invoice = await Invoice.create({
      customer:      customerData._id || customerData.id,
      customerName:  customerData.name,
      customerGstin: customerData.gstin,
      invoiceDate:   invoiceDate || new Date(),
      dueDate,
      lineItems:     processed.map((li, i) => ({
        item:       lineItems[i].item,
        itemName:   lineItems[i].itemName || li.itemName,
        hsnCode:    lineItems[i].hsnCode,
        qty:        li.qty,
        rate:       li.rate,
        discount:   li.discount,
        ...li
      })),
      notes,
      terms,
      createdBy: req.user._id,
      ...totals
    });

    // Update stock
    for (const li of lineItems) {
      await Item.findByIdAndUpdate(li.item, { $inc: { currentStock: -li.qty } });
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/invoices/:id
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name email');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/invoices/:id
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (invoice.status === 'paid')
      return res.status(400).json({ success: false, message: 'Cannot edit a paid invoice.' });

    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/invoices/:id (cancel only)
exports.cancelInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/invoices/summary  (dashboard stats)
exports.getInvoiceSummary = async (req, res) => {
  try {
    const summary = await Invoice.aggregate([
      { $group: {
        _id: '$status',
        count:  { $sum: 1 },
        total:  { $sum: '$totalAmount' },
        unpaid: { $sum: '$balanceDue' }
      }}
    ]);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
