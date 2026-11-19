// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

const JWT_SECRET = process.env.JWT_SECRET || 'agri-market-secret-key';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-2024';

/**
 * Verifies JWT token and attaches user to req.user
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found.' });

    // Check if user is suspended
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    // Check if user is approved (skip for admin routes)
    if (!user.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. You will be notified once approved.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Restricts to farmers only
 */
function requireFarmer(req, res, next) {
  if (!req.user || req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Farmers only.' });
  }
  next();
}

/**
 * Restricts to buyers only
 */
function requireBuyer(req, res, next) {
  if (!req.user || req.user.role !== 'buyer') {
    return res.status(403).json({ error: 'Buyers only.' });
  }
  next();
}

/**
 * Restricts to admin via x-admin-token header
 */
function requireAdmin(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { verifyToken, requireFarmer, requireBuyer, requireAdmin };