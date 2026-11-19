// backend/models/Order.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // ── Who placed it ──────────────────────────
  buyerEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  buyerName: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // ── Delivery ───────────────────────────────
  deliveryAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Full address object stored as JSON string so the frontend can read it back
  addressJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ── Product (kept for admin/stock use) ─────
  productId: {
    type: DataTypes.UUID,
    allowNull: true   // nullable so multi-item cart orders don't need a single productId
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  // ── Full cart items stored as JSON string ──
  // e.g. [{ name, quantity, price, icon, imageUrl }, ...]
  itemsJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ── Frontend-generated tracking ID ─────────
  // e.g. "AGRI-XK9T2A"
  trackingId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // ── Order date (ISO string from frontend) ──
  orderDate: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // ── Order status ───────────────────────────
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },

  // ── Tracking fields (admin-controlled) ─────
  trackingStatus: {
    type: DataTypes.ENUM('order_placed', 'processing', 'dispatched', 'out_for_delivery', 'delivered'),
    defaultValue: 'order_placed'
  },
  trackingStep: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  trackingNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimatedDelivery: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // ── Frontend status display fields ─────────
  statusKey: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'placed'
  },
  statusLabel: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Order Placed'
  },
  statusStep: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  statusDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Will be dispatched in 2 days'
  }
});

module.exports = Order;