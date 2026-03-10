const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/trial-balance',        ctrl.trialBalance);
router.get('/profit-loss',          ctrl.profitLoss);
router.get('/customer-outstanding', ctrl.customerOutstanding);
router.get('/gst-summary',          ctrl.gstSummary);
router.get('/stock-summary',        ctrl.stockSummary);

module.exports = router;
