const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class User extends Model {}

User.init({
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Nullable para usuarios de Google
  },
  google_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  auth_provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'local'
  },
  profile_picture: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'user',
  tableName: 'USERS',
  schema: process.env.DB_SCHEMA || 'auth_service',
  timestamps: true,
  indexes: [
    {
      name: 'idx_users_google_id',
      fields: ['google_id']
    },
    {
      name: 'idx_users_email',
      fields: ['email']
    },
    {
      name: 'idx_users_auth_provider',
      fields: ['auth_provider']
    }
  ]
});

module.exports = User;
