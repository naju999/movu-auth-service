const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const router = express.Router();

// ============================================
// RUTA 1: Iniciar Login con Google
// ============================================
// El Gateway redirige aquí: /api/auth/google
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false // No usar sesiones, usaremos JWT
  })
);

// ============================================
// RUTA 2: Callback de Google
// ============================================
// Google redirige aquí después del login
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=auth_failed`
  }),
  (req, res) => {
    try {
      // Usuario autenticado exitosamente
      const user = req.user;

      // Obtener roles del usuario
      const userRoles = user.roles ? user.roles.map(role => role.role_name) : [];
      const primaryRole = userRoles.length > 0 ? userRoles[0] : 'user';

      // Generar JWT token
      const token = jwt.sign(
        {
          id: user.user_id,
          userId: user.user_id, // Para compatibilidad con gateway
          username: user.username,
          email: user.email,
          role: primaryRole,
          roles: userRoles,
          provider: user.auth_provider || 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Generar refresh token (opcional)
      const refreshToken = jwt.sign(
        { id: user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
      );

      // Redirigir al index.html del gateway con el token como parámetro
      res.redirect(
        `${process.env.FRONTEND_URL}/index.html?token=${token}&refresh=${refreshToken}`
      );
    } catch (error) {
      console.error('Error en callback de Google:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login.html?error=token_generation_failed`);
    }
  }
);

// ============================================
// RUTA 3: Verificar Token (para el Gateway)
// ============================================
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      user: {
        id: decoded.id || decoded.userId,
        userId: decoded.userId || decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        roles: decoded.roles || [decoded.role],
        provider: decoded.provider
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// ============================================
// RUTA 4: Obtener Información del Usuario
// ============================================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario en DB
    const user = await User.findByPk(decoded.id || decoded.userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] }
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRoles = user.roles ? user.roles.map(role => role.role_name) : [];

    res.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        picture: user.profile_picture,
        role: userRoles.length > 0 ? userRoles[0] : 'user',
        roles: userRoles,
        provider: user.auth_provider
      }
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// ============================================
// RUTA 5: Logout
// ============================================
router.post('/logout', (req, res) => {
  // Con JWT, el logout es del lado del cliente (eliminar token)
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ============================================
// RUTA 6: Refresh Token
// ============================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRoles = user.roles ? user.roles.map(role => role.role_name) : [];
    const primaryRole = userRoles.length > 0 ? userRoles[0] : 'user';

    // Generar nuevo access token
    const newToken = jwt.sign(
      {
        id: user.user_id,
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: primaryRole,
        roles: userRoles,
        provider: user.auth_provider
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Error en /refresh:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

module.exports = router;
