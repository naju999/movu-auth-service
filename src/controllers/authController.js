const authService = require('../services/authService');
const {
  publishUserRegistered,
  publishUserLoggedIn,
  publishTokenRefreshed,
  publishUserLoggedOut
} = require('../config/kafka');
const { getAuthUrl, getGoogleUser, verifyGoogleToken } = require('../config/googleOAuth');

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          error: 'Missing required fields: username, email, password'
        });
      }

      const user = await authService.register(username, email, password);

      await publishUserRegistered(user);

      return res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message === 'Email already registered') {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({
        error: 'Registration failed',
        details: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing required fields: email, password'
        });
      }

      const result = await authService.login(email, password);

      await publishUserLoggedIn(result.user);

      return res.status(200).json({
        message: 'Login successful',
        ...result
      });
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Missing refresh token'
        });
      }

      const result = await authService.refresh(refreshToken);

      await publishTokenRefreshed(result.user);

      return res.status(200).json({
        message: 'Token refreshed successfully',
        ...result
      });
    } catch (error) {
      if (error.message.includes('expired') || error.message.includes('not found')) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Missing refresh token'
        });
      }

      // PRIMERO: Verificar el token para obtener el user_id
      let decoded;
      try {
        decoded = authService.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token'
        });
      }

      // SEGUNDO: Revocar el token
      await authService.logout(refreshToken);

      // TERCERO: Publicar evento de logout
      await publishUserLoggedOut(decoded.user_id);

      return res.status(200).json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }

  // ========== MÉTODOS PARA OAUTH 2.0 DE GOOGLE ==========

  async googleAuthUrl(req, res) {
    try {
      const authUrl = getAuthUrl();
      return res.status(200).json({
        authUrl
      });
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      return res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  }

  async googleCallback(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          error: 'Missing authorization code'
        });
      }

      const googleData = await getGoogleUser(code);
      const result = await authService.loginWithGoogle(googleData);

      await publishUserLoggedIn(result.user);

      return res.status(200).json({
        message: 'Login with Google successful',
        ...result
      });
    } catch (error) {
      console.error('Google callback error:', error);
      return res.status(500).json({ error: 'Google authentication failed' });
    }
  }

  async googleTokenLogin(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          error: 'Missing Google ID token'
        });
      }

      const googleData = await verifyGoogleToken(idToken);
      const result = await authService.loginWithGoogle(googleData);

      await publishUserLoggedIn(result.user);

      return res.status(200).json({
        message: 'Login with Google successful',
        ...result
      });
    } catch (error) {
      console.error('Google token login error:', error);
      if (error.message === 'Invalid Google token') {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Google authentication failed' });
    }
  }
}

module.exports = new AuthController();
