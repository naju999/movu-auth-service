const { Role, UserRole, User } = require('../models');

class RoleService {
  async getUserRoles(userId) {
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.roles.map(role => ({
      role_id: role.role_id,
      role_name: role.role_name
    }));
  }

  async assignRole(userId, roleName) {
    const role = await Role.findOne({ where: { role_name: roleName } });

    if (!role) {
      throw new Error('Role not found');
    }

    const existingAssignment = await UserRole.findOne({
      where: { user_id: userId, role_id: role.role_id }
    });

    if (existingAssignment) {
      throw new Error('User already has this role');
    }

    await UserRole.create({
      user_id: userId,
      role_id: role.role_id
    });

    return { role_id: role.role_id, role_name: role.role_name };
  }

  async removeRole(userId, roleName) {
    const role = await Role.findOne({ where: { role_name: roleName } });

    if (!role) {
      throw new Error('Role not found');
    }

    const deleted = await UserRole.destroy({
      where: { user_id: userId, role_id: role.role_id }
    });

    if (!deleted) {
      throw new Error('User does not have this role');
    }

    return true;
  }

  async getAllRoles() {
    return await Role.findAll({
      attributes: ['role_id', 'role_name']
    });
  }

  async createRole(roleName) {
    const existing = await Role.findOne({ where: { role_name: roleName } });

    if (existing) {
      throw new Error('Role already exists');
    }

    const role = await Role.create({ role_name: roleName });
    return { role_id: role.role_id, role_name: role.role_name };
  }
}

module.exports = new RoleService();
