const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/summary', ctrl.getInvoiceSummary);
router.get('/',        ctrl.getInvoices);
router.post('/',       ctrl.createInvoice);
router.get('/:id',     ctrl.getInvoice);
router.put('/:id',     ctrl.updateInvoice);
router.patch('/:id/cancel', ctrl.cancelInvoice);

module.exports = router;
