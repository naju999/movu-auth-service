require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const { sequelize } = require('./models');

// Importar rutas
const authRoutesPassport = require('./routes/auth.routes');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Passport
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Movu Auth Service',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/health',
      auth: {
        google: '/api/auth/google',
        callback: '/api/auth/google/callback',
        verify: '/api/auth/verify',
        me: '/api/auth/me',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout'
      },
      legacy: {
        register: '/auth/register',
        login: '/auth/login',
        refresh: '/auth/refresh',
        logout: '/auth/logout'
      }
    }
  });
});

// Rutas de autenticación con Passport (Google OAuth 2.0)
app.use('/api/auth', authRoutesPassport);

// Rutas de autenticación tradicionales (compatibilidad)
app.use('/auth', authRoutes);
app.use('/auth', roleRoutes);

// Iniciar servidor
(async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Iniciar servidor (escuchar en 0.0.0.0 para IPv4 + IPv6)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('==============================================');
      console.log(`🔐 Auth Service running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🌐 Google OAuth configured');
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Google login: http://localhost:${PORT}/api/auth/google`);
      console.log('==============================================');
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
})();

module.exports = app;
