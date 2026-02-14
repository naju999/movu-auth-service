const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Role extends Model {}

Role.init({
  role_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'roles',
  schema: process.env.DB_SCHEMA || 'auth_service',
  timestamps: false
});
module.exports = Role;
