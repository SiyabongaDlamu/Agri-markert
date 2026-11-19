// backend/controllers/productsController.js
// Replaces the localStorage-based product system in farmer.html and Home.html.
// All products now live in Firestore under the "products" collection.

const { db } = require("../config/firebase");
const { validationResult } = require("express-validator");

// GET /api/products
// Public — buyers and guests can browse all products
async function getAllProducts(req, res) {
  try {
    const { region, minPrice, maxPrice, limit = 20 } = req.query;

    let query = db.collection("products").where("active", "==", true);

    // Optional filters
    if (region) query = query.where("region", "==", region);
    if (minPrice) query = query.where("price", ">=", parseFloat(minPrice));
    if (maxPrice) query = query.where("price", "<=", parseFloat(maxPrice));

    query = query.orderBy("createdAt", "desc").limit(parseInt(limit));

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ products, count: products.length });
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Could not fetch products." });
  }
}

// GET /api/products/my
// Farmer only — returns only their own products
async function getMyProducts(req, res) {
  try {
    const snapshot = await db
      .collection("products")
      .where("farmerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch your products." });
  }
}

// POST /api/products
// Farmer only — add a new product listing
async function createProduct(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, price, description, region, icon, imageUrl, unit } = req.body;

  try {
    const product = {
      name,
      price: parseFloat(price),
      description: description || "Fresh from local farm",
      region: region || req.user.region || "South Africa",
      icon: icon || "🥬",
      imageUrl: imageUrl || null,
      unit: unit || "kg",                    // e.g. "kg", "bunch", "each"
      farmerId: req.user.uid,
      farmerName: req.user.name,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("products").add(product);

    res.status(201).json({
      message: `"${name}" added to marketplace!`,
      product: { id: docRef.id, ...product },
    });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Could not add product." });
  }
}

// PATCH /api/products/:id
// Farmer only — edit their own product
async function updateProduct(req, res) {
  const { id } = req.params;

  try {
    const docRef = db.collection("products").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Make sure this product belongs to the requesting farmer
    if (doc.data().farmerId !== req.user.uid) {
      return res.status(403).json({ error: "You can only edit your own products." });
    }

    const allowedFields = ["name", "price", "description", "region", "icon", "imageUrl", "unit", "active"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.updatedAt = new Date().toISOString();

    await docRef.update(updates);
    res.json({ message: "Product updated.", updates });
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
}

// DELETE /api/products/:id
// Farmer only — remove their listing
async function deleteProduct(req, res) {
  const { id } = req.params;

  try {
    const docRef = db.collection("products").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "Product not found." });
    if (doc.data().farmerId !== req.user.uid) {
      return res.status(403).json({ error: "You can only delete your own products." });
    }

    // Soft delete — set active: false rather than permanently removing
    await docRef.update({ active: false, deletedAt: new Date().toISOString() });

    res.json({ message: "Product removed from marketplace." });
  } catch (err) {
    res.status(500).json({ error: "Delete failed." });
  }
}

module.exports = { getAllProducts, getMyProducts, createProduct, updateProduct, deleteProduct };
