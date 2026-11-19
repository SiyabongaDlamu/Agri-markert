const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('farmer', 'buyer', 'supplier'),
    allowNull: false
  },
  region: DataTypes.STRING,
  profileComplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Admin approval fields
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false   // Users must be approved by admin before they can log in
  },
  isSuspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  suspendedReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = User;