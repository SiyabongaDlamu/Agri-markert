// backend/routes/index.js
// Central router — connects URL paths to controllers and middleware

const express = require("express");
const { body } = require("express-validator");
const { verifyToken, requireFarmer, requireBuyer } = require("../middleware/auth");
const authCtrl = require("../controllers/authController");
const productsCtrl = require("../controllers/productsController");
const ordersCtrl = require("../controllers/ordersController");

const router = express.Router();

// ============================
// AUTH ROUTES
// ============================

// Register profile (called after Firebase Auth signup on frontend)
router.post(
  "/auth/register",
  [
    body("uid").notEmpty().withMessage("UID required"),
    body("name").trim().notEmpty().withMessage("Name required"),
    body("role").isIn(["farmer", "buyer", "supplier"]).withMessage("Invalid role"),
  ],
  authCtrl.register
);

// Get current user profile (protected)
router.get("/auth/me", verifyToken, authCtrl.getMe);

// Update profile
router.patch("/auth/profile", verifyToken, authCtrl.updateProfile);

// ============================
// PRODUCT ROUTES
// ============================

// Public — browse all products (optional filters: ?region=Gauteng&maxPrice=100)
router.get("/products", productsCtrl.getAllProducts);

// Farmer — get only their products
router.get("/products/my", verifyToken, requireFarmer, productsCtrl.getMyProducts);

// Farmer — add new product
router.post(
  "/products",
  verifyToken,
  requireFarmer,
  [
    body("name").trim().notEmpty().withMessage("Product name required"),
    body("price").isFloat({ min: 0.01 }).withMessage("Price must be a positive number"),
  ],
  productsCtrl.createProduct
);

// Farmer — edit product
router.patch("/products/:id", verifyToken, requireFarmer, productsCtrl.updateProduct);

// Farmer — remove product
router.delete("/products/:id", verifyToken, requireFarmer, productsCtrl.deleteProduct);

// ============================
// ORDER ROUTES
// ============================

// Buyer — place order
router.post(
  "/orders",
  verifyToken,
  requireBuyer,
  [
    body("items").isArray({ min: 1 }).withMessage("Cart is empty"),
    body("items.*.productId").notEmpty().withMessage("Product ID required"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  ordersCtrl.placeOrder
);

// Buyer — order history
router.get("/orders/my", verifyToken, requireBuyer, ordersCtrl.getMyOrders);

// Farmer — incoming orders for their products
router.get("/orders/farmer", verifyToken, requireFarmer, ordersCtrl.getFarmerOrders);
// ============================
// ADMIN ROUTES
// ============================
const adminCtrl = require("../controllers/adminController");

// Overview
router.get("/admin/overview/metrics",   adminCtrl.getOverviewMetrics);
router.get("/admin/overview/approvals", adminCtrl.getPendingApprovals);
router.get("/admin/overview/orders",    adminCtrl.getRecentOrders);

// Users
router.get("/admin/users",                  adminCtrl.getUsers);
router.patch("/admin/users/:id/status",     adminCtrl.updateUserStatus);
router.delete("/admin/users/:id",           adminCtrl.deleteUser);

// Products
router.get("/admin/products/metrics",       adminCtrl.getProductMetrics);
router.get("/admin/products",               adminCtrl.getAdminProducts);
router.patch("/admin/products/:id/status",  adminCtrl.updateProductStatus);
router.patch("/admin/products/:id/featured",adminCtrl.toggleFeatured);
router.delete("/admin/products/:id",        adminCtrl.removeProduct);

// Orders
router.get("/admin/orders/metrics",         adminCtrl.getOrderMetrics);
router.get("/admin/orders",                 adminCtrl.getAdminOrders);
router.patch("/admin/orders/:id/status",    adminCtrl.updateOrderStatus);

// Payments
router.get("/admin/payments/metrics",       adminCtrl.getPaymentMetrics);
router.get("/admin/payments",               adminCtrl.getTransactions);
router.patch("/admin/payments/:id/status",  adminCtrl.updateTxnStatus);

// Content
router.get("/admin/content/tips",           adminCtrl.getTips);
router.post("/admin/content/tips",          adminCtrl.addTip);
router.patch("/admin/content/tips/:id/status", adminCtrl.updateTipStatus);
router.delete("/admin/content/tips/:id",    adminCtrl.deleteTip);
router.get("/admin/content/categories",     adminCtrl.getCategories);
router.post("/admin/content/categories",    adminCtrl.addCategory);
router.delete("/admin/content/categories/:id", adminCtrl.deleteCategory);

// Analytics
router.get("/admin/analytics/metrics",      adminCtrl.getAnalyticsMetrics);
router.get("/admin/analytics/weekly",       adminCtrl.getWeeklyRevenue);
router.get("/admin/analytics/top-farmers",  adminCtrl.getTopFarmers);

// Settings
router.get("/admin/settings/commission",    adminCtrl.getCommissionRate);
router.put("/admin/settings/commission",    adminCtrl.setCommissionRate);
// ============================
// ADMIN ROUTES
// ============================
const adminCtrl = require("../controllers/adminController");

router.get("/admin/overview/metrics",        adminCtrl.getOverviewMetrics);
router.get("/admin/overview/approvals",      adminCtrl.getPendingApprovals);
router.get("/admin/overview/orders",         adminCtrl.getRecentOrders);

router.get("/admin/users",                   adminCtrl.getUsers);
router.patch("/admin/users/:id/status",      adminCtrl.updateUserStatus);
router.delete("/admin/users/:id",            adminCtrl.deleteUser);

router.get("/admin/products/metrics",        adminCtrl.getProductMetrics);
router.get("/admin/products",                adminCtrl.getAdminProducts);
router.patch("/admin/products/:id/status",   adminCtrl.updateProductStatus);
router.patch("/admin/products/:id/featured", adminCtrl.toggleFeatured);
router.delete("/admin/products/:id",         adminCtrl.removeProduct);

router.get("/admin/orders/metrics",          adminCtrl.getOrderMetrics);
router.get("/admin/orders",                  adminCtrl.getAdminOrders);
router.patch("/admin/orders/:id/status",     adminCtrl.updateOrderStatus);

router.get("/admin/payments/metrics",        adminCtrl.getPaymentMetrics);
router.get("/admin/payments",                adminCtrl.getTransactions);
router.patch("/admin/payments/:id/status",   adminCtrl.updateTxnStatus);

router.get("/admin/content/tips",            adminCtrl.getTips);
router.post("/admin/content/tips",           adminCtrl.addTip);
router.patch("/admin/content/tips/:id/status", adminCtrl.updateTipStatus);
router.delete("/admin/content/tips/:id",     adminCtrl.deleteTip);
router.get("/admin/content/categories",      adminCtrl.getCategories);
router.post("/admin/content/categories",     adminCtrl.addCategory);
router.delete("/admin/content/categories/:id", adminCtrl.deleteCategory);

router.get("/admin/analytics/metrics",       adminCtrl.getAnalyticsMetrics);
router.get("/admin/analytics/weekly",        adminCtrl.getWeeklyRevenue);
router.get("/admin/analytics/top-farmers",   adminCtrl.getTopFarmers);

router.get("/admin/settings/commission",     adminCtrl.getCommissionRate);
router.put("/admin/settings/commission",     adminCtrl.setCommissionRate);

module.exports = router;
module.exports = router;
