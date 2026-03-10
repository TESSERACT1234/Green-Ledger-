const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

const GST_RATES = [
  { rate: 0,  description: 'Exempt / Nil rated' },
  { rate: 5,  description: 'Essential goods (e.g. biodiesel feedstock)' },
  { rate: 12, description: 'Standard goods' },
  { rate: 18, description: 'Standard goods/services' },
  { rate: 28, description: 'Luxury goods' }
];

router.use(protect);
router.get('/rates',  (req, res) => res.json({ success: true, data: GST_RATES }));
router.get('/states', (req, res) => res.json({ success: true, data: require('../utils/indianStates') }));
module.exports = router;
