// backend/controllers/ordersController.js
// Replaces the alert() checkout in shopping-cart.html with a real order system.
// Orders are stored in Firestore and a confirmation email is sent to the buyer.

const { db } = require("../config/firebase");
const { sendOrderConfirmation } = require("../config/email");

// POST /api/orders
// Buyer places an order from their cart
async function placeOrder(req, res) {
  const { items, deliveryAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  try {
    // Validate each product still exists and is in stock
    const productRefs = items.map((item) => db.collection("products").doc(item.productId));
    const productDocs = await Promise.all(productRefs.map((ref) => ref.get()));

    const validatedItems = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      const doc = productDocs[i];
      if (!doc.exists || !doc.data().active) {
        return res.status(400).json({
          error: `Product "${items[i].name}" is no longer available.`,
        });
      }
      const product = doc.data();
      const lineTotal = product.price * items[i].quantity;
      total += lineTotal;

      validatedItems.push({
        productId: doc.id,
        name: product.name,
        price: product.price,
        quantity: items[i].quantity,
        lineTotal,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
      });
    }

    // Create the order document
    const order = {
      buyerId: req.user.uid,
      buyerName: req.user.name,
      buyerEmail: req.user.email,
      items: validatedItems,
      total: parseFloat(total.toFixed(2)),
      deliveryAddress: deliveryAddress || null,
      status: "confirmed",            // confirmed → processing → delivered
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orderRef = await db.collection("orders").add(order);

    // Send confirmation email (non-blocking — don't fail the order if email fails)
    sendOrderConfirmation(req.user.email, req.user.name, {
      orderId: orderRef.id,
      items: validatedItems,
      total: order.total,
    }).catch((err) => console.error("Email send failed (non-critical):", err));

    res.status(201).json({
      message: "Order placed successfully! Check your email for confirmation.",
      orderId: orderRef.id,
      total: order.total,
    });
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Could not place order. Please try again." });
  }
}

// GET /api/orders/my
// Buyer — their order history
async function getMyOrders(req, res) {
  try {
    const snapshot = await db
      .collection("orders")
      .where("buyerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch orders." });
  }
}

// GET /api/orders/farmer
// Farmer — orders containing their products
async function getFarmerOrders(req, res) {
  try {
    // Find orders that contain at least one product from this farmer
    const snapshot = await db
      .collection("orders")
      .where("items", "array-contains-any", [{ farmerId: req.user.uid }])
      .orderBy("createdAt", "desc")
      .get();

    // Filter client-side to only show items belonging to this farmer
    const orders = snapshot.docs.map((doc) => {
      const order = { id: doc.id, ...doc.data() };
      order.items = order.items.filter((item) => item.farmerId === req.user.uid);
      return order;
    });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch farmer orders." });
  }
}

module.exports = { placeOrder, getMyOrders, getFarmerOrders };
