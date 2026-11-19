// backend/controllers/adminController.js
const { User, Product, Order } = require('../models/index');
const { Op } = require('sequelize');

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const [totalUsers, totalProducts, totalOrders, pendingApprovals] = await Promise.all([
      User.count(),
      Product.count(),
      Order.count(),
      User.count({ where: { isApproved: false, isSuspended: false } })
    ]);

    const allRevenue       = await Order.sum('totalPrice') || 0;
    const deliveredRevenue = await Order.sum('totalPrice', { where: { status: 'delivered' } }) || 0;

    return res.json({ totalUsers, totalProducts, totalOrders, pendingApprovals, totalRevenue: allRevenue, deliveredRevenue });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

// GET /api/admin/users
async function getUsers(req, res) {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] });
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

// PATCH /api/admin/users/:id/approve
async function approveUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update({ isApproved: true, isSuspended: false, suspendedReason: null, approvedAt: new Date() });
    const safe = user.toJSON(); delete safe.password;
    return res.json({ message: `${user.name} approved.`, user: safe });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to approve user.' });
  }
}

// PATCH /api/admin/users/:id/suspend
async function suspendUser(req, res) {
  const { reason } = req.body;
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update({ isSuspended: true, isApproved: false, suspendedReason: reason || 'No reason given.' });
    return res.json({ message: `${user.name} suspended.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to suspend user.' });
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.destroy();
    return res.json({ message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
}

// GET /api/admin/orders
async function getAllOrders(req, res) {
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });

    const enriched = await Promise.all(orders.map(async (o) => {
      let productName = 'Unknown Product', productImage = null;
      try {
        const product = await Product.findByPk(o.productId);
        if (product) { productName = product.name; productImage = product.imageUrl; }
      } catch (_) {}
      return { ...o.toJSON(), productName, productImage };
    }));

    return res.json({ orders: enriched });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
}

// GET /api/admin/products
async function getAllProducts(req, res) {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ products });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products.' });
  }
}

// DELETE /api/admin/products/:id
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    await product.destroy();
    return res.json({ message: 'Product removed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
}

module.exports = { getStats, getUsers, approveUser, suspendUser, deleteUser, getAllOrders, getAllProducts, deleteProduct };