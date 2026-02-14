const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const { connectProducer, disconnectProducer } = require('./config/kafka');
const client = require('prom-client');

const app = express();
app.use(express.json());

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/', (req, res) => res.send('Auth service online'));

app.use('/auth', authRoutes);
app.use('/auth', roleRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');

    try {
      await connectProducer();
    } catch (kafkaError) {
      console.warn('Kafka no disponible. El servicio continuará sin publicar eventos.');
      console.warn('Para habilitar Kafka, ejecuta: docker run -d -p 2181:2181 -p 9092:9092 apache/kafka');
    }

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      try {
        await disconnectProducer();
      } catch (err) {
        console.log('Kafka already disconnected');
      }
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error al iniciar:', error);
  }
})();
