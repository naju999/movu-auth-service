const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock de dependencias
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
  },
  Role: {
    findOne: jest.fn()
  }
}));

// Set env vars before requiring authService
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.JWT_REFRESH_SLIDING_WINDOW = '1d';

const authService = require('../src/services/authService');
const { User, RefreshToken } = require('../src/models');

describe('AuthService - Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería registrar un nuevo usuario correctamente', async () => {
    const username = 'newuser';
    const email = 'newuser@example.com';
    const password = 'SecurePass123';
    const hashedPassword = '$2b$10$hashedPassword';

    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue(hashedPassword);
    User.create.mockResolvedValue({
      user_id: 1,
      username,
      email,
      password: hashedPassword
    });

    const result = await authService.register(username, email, password);

    expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    expect(User.create).toHaveBeenCalledWith({
      username,
      email,
      password: hashedPassword
    });
    expect(result).toEqual({
      user_id: 1,
      username,
      email
    });
  });

  test('debería lanzar error si el email ya está registrado', async () => {
    const username = 'testuser';
    const email = 'existing@example.com';
    const password = 'password123';

    User.findOne.mockResolvedValue({
      user_id: 1,
      email,
      username: 'existinguser'
    });

    await expect(authService.register(username, email, password))
      .rejects
      .toThrow('Email already registered');

    expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('AuthService - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería hacer login correctamente con credenciales válidas', async () => {
    const email = 'user@example.com';
    const password = 'correctPassword';
    const mockUser = {
      user_id: 1,
      username: 'testuser',
      email,
      password: '$2b$10$hashedPassword',
      roles: [{ role_name: 'user' }]
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock.token');
    RefreshToken.create.mockResolvedValue({});

    const result = await authService.login(email, password);

    expect(User.findOne).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe(email);
    expect(result.user.roles).toEqual(['user']);
  });

  test('debería lanzar error con credenciales inválidas', async () => {
    const email = 'user@example.com';
    const password = 'wrongPassword';

    User.findOne.mockResolvedValue(null);

    await expect(authService.login(email, password))
      .rejects
      .toThrow('Invalid credentials');

    expect(User.findOne).toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});

describe('AuthService - Google OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería crear un nuevo usuario con Google OAuth', async () => {
    const googleData = {
      googleId: 'google123',
      email: 'googleuser@example.com',
      name: 'Google User',
      picture: 'https://example.com/picture.jpg',
      emailVerified: true
    };

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    User.create.mockResolvedValue({
      user_id: 1,
      username: 'googleuser@example.com_abc123',
      email: googleData.email,
      google_id: googleData.googleId,
      auth_provider: 'google',
      profile_picture: googleData.picture,
      password: null
    });
    User.findByPk.mockResolvedValue({
      user_id: 1,
      username: 'googleuser@example.com_abc123',
      email: googleData.email,
      google_id: googleData.googleId,
      auth_provider: 'google',
      profile_picture: googleData.picture,
      roles: []
    });
    jwt.sign.mockReturnValue('mock.token');
    RefreshToken.create.mockResolvedValue({});

    const result = await authService.loginWithGoogle(googleData);

    expect(User.create).toHaveBeenCalled();
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe(googleData.email);
    expect(result.user.auth_provider).toBe('google');
    expect(result.user.profile_picture).toBe(googleData.picture);
  });

  test('debería vincular cuenta de Google a usuario existente', async () => {
    const googleData = {
      googleId: 'google456',
      email: 'existing@example.com',
      name: 'Existing User',
      picture: 'https://example.com/new-picture.jpg',
      emailVerified: true
    };

    const existingUser = {
      user_id: 2,
      username: 'existinguser',
      email: googleData.email,
      password: '$2b$10$hashedPassword',
      google_id: null,
      auth_provider: 'local',
      profile_picture: null,
      roles: [{ role_name: 'user' }],
      save: jest.fn()
    };

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser);
    jwt.sign.mockReturnValue('mock.token');
    RefreshToken.create.mockResolvedValue({});

    const result = await authService.loginWithGoogle(googleData);

    expect(existingUser.save).toHaveBeenCalled();
    expect(existingUser.google_id).toBe(googleData.googleId);
    expect(existingUser.auth_provider).toBe('google');
    expect(existingUser.profile_picture).toBe(googleData.picture);
    expect(result.user.email).toBe(googleData.email);
  });
});
