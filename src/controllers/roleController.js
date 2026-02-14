const roleService = require('../services/roleService');

class RoleController {
  async getUserRoles(req, res) {
    try {
      const userId = req.user.user_id;
      const roles = await roleService.getUserRoles(userId);

      return res.status(200).json({
        user_id: userId,
        roles
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get user roles' });
    }
  }

  async assignRole(req, res) {
    try {
      const { userId, roleName } = req.body;

      if (!userId || !roleName) {
        return res.status(400).json({
          error: 'Missing required fields: userId, roleName'
        });
      }

      const role = await roleService.assignRole(userId, roleName);

      return res.status(200).json({
        message: 'Role assigned successfully',
        role
      });
    } catch (error) {
      if (error.message === 'User already has this role') {
        return res.status(409).json({ error: error.message });
      }
      if (error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to assign role' });
    }
  }

  async removeRole(req, res) {
    try {
      const { userId, roleName } = req.body;

      if (!userId || !roleName) {
        return res.status(400).json({
          error: 'Missing required fields: userId, roleName'
        });
      }

      await roleService.removeRole(userId, roleName);

      return res.status(200).json({
        message: 'Role removed successfully'
      });
    } catch (error) {
      if (error.message === 'User does not have this role' || error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to remove role' });
    }
  }

  async getAllRoles(req, res) {
    try {
      const roles = await roleService.getAllRoles();

      return res.status(200).json({ roles });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get roles' });
    }
  }

  async createRole(req, res) {
    try {
      const { roleName } = req.body;

      if (!roleName) {
        return res.status(400).json({
          error: 'Missing required field: roleName'
        });
      }

      const role = await roleService.createRole(roleName);

      return res.status(201).json({
        message: 'Role created successfully',
        role
      });
    } catch (error) {
      if (error.message === 'Role already exists') {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create role' });
    }
  }
}

module.exports = new RoleController();
