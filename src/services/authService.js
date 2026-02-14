const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION;
const REFRESH_TOKEN_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION;
const SLIDING_WINDOW = process.env.JWT_REFRESH_SLIDING_WINDOW;

class AuthService {
  async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  generateAccessToken(userId, username, email, roles = []) {
    return jwt.sign(
      { user_id: userId, username, email, roles, type: 'access' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRATION }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { user_id: userId, type: 'refresh', jti: crypto.randomUUID() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRATION }
    );
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  parseExpiration(expirationString) {
    const match = expirationString.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    return value * multipliers[unit];
  }

  async storeRefreshToken(userId, token) {
    const expirationMs = this.parseExpiration(REFRESH_TOKEN_EXPIRATION);
    const expiresAt = new Date(Date.now() + expirationMs);

    return await RefreshToken.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
      is_revoked: false
    });
  }

  async findRefreshToken(token) {
    return await RefreshToken.findOne({
      where: { token, is_revoked: false }
    });
  }

  async revokeRefreshToken(token) {
    const refreshToken = await this.findRefreshToken(token);
    if (refreshToken) {
      refreshToken.is_revoked = true;
      await refreshToken.save();
    }
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: userId, is_revoked: false } }
    );
  }

  async shouldExtendRefreshToken(expiresAt) {
    const now = Date.now();
    const expirationTime = new Date(expiresAt).getTime();
    const timeRemaining = expirationTime - now;
    const slidingWindowMs = this.parseExpiration(SLIDING_WINDOW);

    return timeRemaining <= slidingWindowMs;
  }

  async rotateRefreshToken(oldToken, userId) {
    await this.revokeRefreshToken(oldToken);

    const newRefreshToken = this.generateRefreshToken(userId);
    await this.storeRefreshToken(userId, newRefreshToken);

    return newRefreshToken;
  }

  async register(username, email, password) {
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email
    };
  }

  async login(email, password) {
    const user = await User.findOne({
      where: { email },
      include: [{
        model: require('../models').Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.comparePassword(password, user.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const userRoles = user.roles.map(role => role.role_name);
    const accessToken = this.generateAccessToken(user.user_id, user.username, user.email, userRoles);
    const refreshToken = this.generateRefreshToken(user.user_id);

    await this.storeRefreshToken(user.user_id, refreshToken);

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        roles: userRoles
      },
      accessToken,
      refreshToken
    };
  }

  async refresh(oldRefreshToken) {
    const decoded = this.verifyRefreshToken(oldRefreshToken);

    const storedToken = await this.findRefreshToken(oldRefreshToken);

    if (!storedToken) {
      throw new Error('Refresh token not found or revoked');
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      throw new Error('Refresh token expired');
    }

    const user = await User.findByPk(decoded.user_id, {
      include: [{
        model: require('../models').Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userRoles = user.roles.map(role => role.role_name);
    const accessToken = this.generateAccessToken(user.user_id, user.username, user.email, userRoles);

    let newRefreshToken = oldRefreshToken;

    if (await this.shouldExtendRefreshToken(storedToken.expires_at)) {
      newRefreshToken = await this.rotateRefreshToken(oldRefreshToken, user.user_id);
    }

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        roles: userRoles
      },
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(refreshToken) {
    await this.revokeRefreshToken(refreshToken);
  }

  async findOrCreateGoogleUser(googleData) {
    const { googleId, email, picture } = googleData;

    // Buscar usuario por google_id
    let user = await User.findOne({
      where: { google_id: googleId },
      include: [{
        model: require('../models').Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (user) {
      // Actualizar foto de perfil si cambió
      if (user.profile_picture !== picture) {
        user.profile_picture = picture;
        await user.save();
      }
      return user;
    }

    // Buscar por email (usuario que ya existe con auth local)
    user = await User.findOne({
      where: { email },
      include: [{
        model: require('../models').Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (user) {
      // Vincular cuenta de Google a cuenta existente
      user.google_id = googleId;
      user.auth_provider = 'google';
      user.profile_picture = picture;
      await user.save();
      return user;
    }

    // Crear nuevo usuario
    const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);

    user = await User.create({
      username,
      email,
      google_id: googleId,
      auth_provider: 'google',
      profile_picture: picture,
      password: null
    });

    // Recargar con roles
    user = await User.findByPk(user.user_id, {
      include: [{
        model: require('../models').Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    return user;
  }

  async loginWithGoogle(googleData) {
    const user = await this.findOrCreateGoogleUser(googleData);

    const userRoles = user.roles.map(role => role.role_name);
    const accessToken = this.generateAccessToken(user.user_id, user.username, user.email, userRoles);
    const refreshToken = this.generateRefreshToken(user.user_id);

    await this.storeRefreshToken(user.user_id, refreshToken);

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        auth_provider: user.auth_provider,
        roles: userRoles
      },
      accessToken,
      refreshToken
    };
  }
}

module.exports = new AuthService();
