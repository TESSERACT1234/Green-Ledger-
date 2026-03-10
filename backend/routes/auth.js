// routes/auth.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login',           ctrl.login);
router.post('/register',        ctrl.register);
router.post('/refresh',         ctrl.refreshToken);
router.get('/me',               protect, ctrl.getMe);
router.put('/change-password',  protect, ctrl.changePassword);

module.exports = router;
