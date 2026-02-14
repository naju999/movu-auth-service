const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas tradicionales
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Rutas de Google OAuth 2.0
router.get('/google', authController.googleAuthUrl);
router.get('/google/callback', authController.googleCallback);
router.post('/google/token', authController.googleTokenLogin);

module.exports = router;
