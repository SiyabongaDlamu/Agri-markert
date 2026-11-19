// backend/routes/index.js
const express = require('express');
const { body } = require('express-validator');
const { verifyToken, requireFarmer, requireBuyer, requireAdmin } = require('../middleware/auth');
const authCtrl    = require('../controllers/authController');
const productsCtrl = require('../controllers/productsController');
const ordersCtrl  = require('../controllers/ordersController');
const adminCtrl   = require('../controllers/adminController');

const router = express.Router();

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
router.post('/auth/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
    body('role').isIn(['farmer', 'buyer', 'supplier']).withMessage('Invalid role')
  ],
  authCtrl.register
);

router.post('/auth/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  authCtrl.login
);

router.get('/auth/me', verifyToken, authCtrl.getMe);

// ─────────────────────────────────────────────
// PRODUCT ROUTES
// ─────────────────────────────────────────────
router.get('/products', productsCtrl.getAllProducts);
router.get('/products/my', verifyToken, requireFarmer, productsCtrl.getMyProducts);

router.post('/products',
  verifyToken, requireFarmer,
  [
    body('name').notEmpty(),
    body('price').isFloat({ gt: 0 }),
    body('stock').optional().isInt({ min: 0 })
  ],
  productsCtrl.createProduct
);

router.patch('/products/:id', verifyToken, requireFarmer, productsCtrl.updateProduct);
router.delete('/products/:id', verifyToken, requireFarmer, productsCtrl.deleteProduct);

// ─────────────────────────────────────────────
// ORDER ROUTES (Buyer)
// ─────────────────────────────────────────────
router.post('/orders',
  verifyToken, requireBuyer,
  ordersCtrl.placeOrder
);

// Frontend calls GET /api/orders — both aliases point to same controller
router.get('/orders',    verifyToken, requireBuyer, ordersCtrl.getMyOrders);
router.get('/orders/my', verifyToken, requireBuyer, ordersCtrl.getMyOrders);

// ─────────────────────────────────────────────
// ORDER TRACKING (Admin)
// ─────────────────────────────────────────────
router.patch('/orders/:id/tracking', requireAdmin, ordersCtrl.updateTracking);
router.delete('/orders/:id', requireAdmin, ordersCtrl.deleteOrder);

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────
router.get('/admin/stats',    requireAdmin, adminCtrl.getStats);
router.get('/admin/users',    requireAdmin, adminCtrl.getUsers);
router.get('/admin/orders',   requireAdmin, adminCtrl.getAllOrders);
router.get('/admin/products', requireAdmin, adminCtrl.getAllProducts);

// User approval / management
router.patch('/admin/users/:id/approve',  requireAdmin, adminCtrl.approveUser);
router.patch('/admin/users/:id/suspend',  requireAdmin, adminCtrl.suspendUser);
router.delete('/admin/users/:id',         requireAdmin, adminCtrl.deleteUser);

// Product management
router.delete('/admin/products/:id', requireAdmin, adminCtrl.deleteProduct);

module.exports = router;