// backend/controllers/productsController.js
// PostgreSQL/Sequelize only — no Firebase dependency.

const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { Product } = require('../models/index');

// GET /api/products
async function getAllProducts(req, res) {
  try {
    const { region, minPrice, maxPrice, limit = 20 } = req.query;
    const where = {};
    if (region)   where.location = region;
    if (minPrice) where.price    = { ...where.price, [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.price    = { ...where.price, [Op.lte]: parseFloat(maxPrice) };

    const products = await Product.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({ products, count: products.length });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Could not fetch products.' });
  }
}

// GET /api/products/my  (farmer only)
async function getMyProducts(req, res) {
  try {
    const products = await Product.findAll({
      where: { farmerEmail: req.user.email },
      order: [['createdAt', 'DESC']],
    });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch your products.' });
  }
}

// POST /api/products  (farmer only)
async function createProduct(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, price, description, location, imageUrl, stock } = req.body;

  try {
    const product = await Product.create({
      name,
      price:       parseFloat(price),
      description: description || 'Fresh from local farm',
      location:    location   || req.user.region || 'South Africa',
      imageUrl:    imageUrl   || null,
      stock:       stock      ?? 0,
      farmerEmail: req.user.email,
    });

    res.status(201).json({ message: `"${name}" added to marketplace!`, product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Could not add product.' });
  }
}

// PATCH /api/products/:id  (farmer only)
async function updateProduct(req, res) {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.farmerEmail !== req.user.email) {
      return res.status(403).json({ error: 'You can only edit your own products.' });
    }

    const allowed = ['name', 'price', 'description', 'location', 'imageUrl', 'stock'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await product.update(updates);
    res.json({ message: 'Product updated.', product });
  } catch (err) {
    res.status(500).json({ error: 'Update failed.' });
  }
}

// DELETE /api/products/:id  (farmer only)
async function deleteProduct(req, res) {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.farmerEmail !== req.user.email) {
      return res.status(403).json({ error: 'You can only delete your own products.' });
    }

    await product.destroy();
    res.json({ message: 'Product removed from marketplace.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed.' });
  }
}

module.exports = { getAllProducts, getMyProducts, createProduct, updateProduct, deleteProduct };