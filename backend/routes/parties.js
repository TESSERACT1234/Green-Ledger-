const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/partyController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/summary',           ctrl.getSummary);
router.get('/',                  ctrl.getParties);
router.post('/',                 ctrl.createParty);
router.get('/:id',               ctrl.getParty);
router.put('/:id',               ctrl.updateParty);
router.delete('/:id',            adminOnly, ctrl.deleteParty);
router.get('/:id/transactions',  ctrl.getTransactions);
router.post('/:id/transactions', ctrl.createTransaction);

module.exports = router;