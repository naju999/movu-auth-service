const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class UserRole extends Model {}

UserRole.init({
  user_role_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  sequelize,
  modelName: 'UserRole',
  tableName: 'user_roles',
  schema: process.env.DB_SCHEMA || 'auth_service',
  timestamps: false
});
module.exports = UserRole;
