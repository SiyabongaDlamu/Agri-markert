// backend/controllers/ordersController.js
const { Order, Product } = require('../models/index');

const TRACKING_STEPS = {
  order_placed:     { step: 1, label: 'Order Placed' },
  processing:       { step: 2, label: 'Processing' },
  dispatched:       { step: 3, label: 'Dispatched' },
  out_for_delivery: { step: 4, label: 'Out for Delivery' },
  delivered:        { step: 5, label: 'Delivered' }
};

// Converts a DB row into the shape the buyer frontend expects
function orderToFrontend(o) {
  const raw = o.toJSON ? o.toJSON() : o;

  let items = [];
  try { items = JSON.parse(raw.itemsJson || '[]'); } catch (_) {}

  let address = {};
  try { address = JSON.parse(raw.addressJson || '{}'); } catch (_) {}

  return {
    trackingId:        raw.trackingId        || raw.id,
    date:              raw.orderDate         || raw.createdAt,
    items,
    total:             parseFloat(raw.totalPrice),
    address,
    statusKey:         raw.statusKey         || 'placed',
    statusLabel:       raw.statusLabel       || 'Order Placed',
    statusStep:        raw.statusStep        || 1,
    statusDescription: raw.statusDescription || 'Will be dispatched in 2 days',
    trackingStatus:    raw.trackingStatus,
    trackingStep:      raw.trackingStep,
    trackingNote:      raw.trackingNote,
    estimatedDelivery: raw.estimatedDelivery,
    status:            raw.status,
    buyerEmail:        raw.buyerEmail,
    buyerName:         raw.buyerName,
    id:                raw.id
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/orders
// Accepts the full cart-style body that the buyer frontend sends
// ─────────────────────────────────────────────────────────────
async function placeOrder(req, res) {
  const buyerEmail = req.user.email;
  const buyerName  = req.user.name;

  const {
    trackingId,
    date,
    items,
    total,
    address,
    statusKey         = 'placed',
    statusLabel       = 'Order Placed',
    statusStep        = 1,
    statusDescription = 'Will be dispatched in 2 days'
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required and must not be empty.' });
  }
  if (total === undefined || total === null) {
    return res.status(400).json({ error: 'total is required.' });
  }

  try {
    const deliveryAddress = address
      ? `${address.fullName || ''}, ${address.street || ''}, ${address.city || ''}, ${address.zip || ''}`.trim()
      : '';

    const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

    const order = await Order.create({
      buyerEmail,
      buyerName,
      deliveryAddress,
      addressJson:       JSON.stringify(address || {}),
      productId:         items[0]?.id || null,
      quantity:          totalQty,
      totalPrice:        parseFloat(Number(total).toFixed(2)),
      itemsJson:         JSON.stringify(items),
      trackingId:        trackingId || ('AGRI-' + Math.random().toString(36).substring(2, 10).toUpperCase()),
      orderDate:         date || new Date().toISOString(),
      status:            'pending',
      trackingStatus:    'order_placed',
      trackingStep:      1,
      trackingNote:      statusDescription,
      statusKey,
      statusLabel,
      statusStep,
      statusDescription
    });

    return res.status(201).json({ order: orderToFrontend(order) });
  } catch (err) {
    console.error('placeOrder error:', err);
    return res.status(500).json({ error: 'Failed to place order.' });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/orders  (also aliased from GET /api/orders/my)
// Returns only the logged-in buyer's orders
// ─────────────────────────────────────────────────────────────
async function getMyOrders(req, res) {
  try {
    const rows = await Order.findAll({
      where: { buyerEmail: req.user.email },
      order: [['createdAt', 'DESC']]
    });

    return res.json({ orders: rows.map(orderToFrontend) });
  } catch (err) {
    console.error('getMyOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/tracking  — admin updates tracking
// ─────────────────────────────────────────────────────────────
async function updateTracking(req, res) {
  const { id } = req.params;
  const { trackingStatus, trackingNote, estimatedDelivery } = req.body;

  if (!trackingStatus) {
    return res.status(400).json({ error: 'trackingStatus is required.' });
  }
  if (!TRACKING_STEPS[trackingStatus]) {
    return res.status(400).json({
      error: `Invalid trackingStatus. Must be one of: ${Object.keys(TRACKING_STEPS).join(', ')}`
    });
  }

  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const updates = {
      trackingStatus,
      trackingStep: TRACKING_STEPS[trackingStatus].step,
      statusLabel:  TRACKING_STEPS[trackingStatus].label,
      statusStep:   TRACKING_STEPS[trackingStatus].step
    };

    if (trackingStatus === 'delivered')    updates.status = 'delivered';
    else if (trackingStatus === 'order_placed') updates.status = 'pending';
    else updates.status = 'confirmed';

    if (trackingNote      !== undefined) updates.trackingNote      = trackingNote;
    if (estimatedDelivery !== undefined) updates.estimatedDelivery = estimatedDelivery;

    await order.update(updates);

    return res.json({
      message: 'Tracking updated successfully.',
      order: orderToFrontend(order)
    });
  } catch (err) {
    console.error('updateTracking error:', err);
    return res.status(500).json({ error: 'Failed to update tracking.' });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/orders/:id  — admin deletes a delivered order
// ─────────────────────────────────────────────────────────────
async function deleteOrder(req, res) {
  const { id } = req.params;
  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be deleted.' });
    }

    await order.destroy();
    return res.json({ message: 'Order deleted successfully.' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    return res.status(500).json({ error: 'Failed to delete order.' });
  }
}

module.exports = { placeOrder, getMyOrders, updateTracking, deleteOrder };