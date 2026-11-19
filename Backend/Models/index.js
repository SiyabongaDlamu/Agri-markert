const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

module.exports = { sequelize, User, Product, Order, syncDatabase };