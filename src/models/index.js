const { sequelize } = require('../config/database');
const User = require('./user');
const Role = require('./role');
const UserRole = require('./user_role');
const RefreshToken = require('./refresh_token');

User.hasMany(UserRole, {
  foreignKey: 'user_id',
  as: 'userRoles'
});

UserRole.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Role.hasMany(UserRole, {
  foreignKey: 'role_id',
  as: 'userRoles'
});

UserRole.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role'
});

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles'
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users'
});

User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens'
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  RefreshToken
};
