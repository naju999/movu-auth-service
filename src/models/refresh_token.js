const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class RefreshToken extends Model {}

RefreshToken.init({
  token_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'RefreshToken',
  tableName: 'refresh_tokens',
  schema: process.env.DB_SCHEMA || 'auth_service',
  timestamps: true
});

module.exports = RefreshToken;
