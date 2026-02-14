const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.get('/me/roles', authMiddleware, roleController.getUserRoles);

router.get('/roles', authMiddleware, roleController.getAllRoles);

router.post('/roles', authMiddleware, requireRole('admin'), roleController.createRole);

router.post('/roles/assign', authMiddleware, requireRole('admin'), roleController.assignRole);

router.post('/roles/remove', authMiddleware, requireRole('admin'), roleController.removeRole);

module.exports = router;
