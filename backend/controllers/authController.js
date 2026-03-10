const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });

// @POST /api/v1/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token        = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/auth/register (admin only after first setup)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({ name, email, password, role: role || 'accountant' });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ success: false, message: 'User not found.' });
    res.json({ success: true, token: signToken(user._id) });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token invalid.' });
  }
};

// @GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @PUT /api/v1/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
