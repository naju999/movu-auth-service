const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'movu-auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();

let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error.message);
      throw error;
    }
  }
}

async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka producer disconnected');
  }
}

async function publishEvent(eventType, payload) {
  try {
    if (!isConnected) {
      console.log(`Kafka no disponible. Evento no publicado: ${eventType}`);
      return;
    }

    const message = {
      key: payload.user_id?.toString() || 'system',
      value: JSON.stringify({
        eventType,
        timestamp: new Date().toISOString(),
        data: payload
      }),
      headers: {
        'event-type': eventType,
        service: 'auth-service'
      }
    };

    await producer.send({
      topic: process.env.KAFKA_TOPIC_AUTH_EVENTS || 'auth.events',
      messages: [message]
    });

    console.log(`Event published: ${eventType}`, payload);
  } catch (error) {
    console.error(`Failed to publish event ${eventType}:`, error.message);
  }
}

async function publishUserRegistered(user) {
  await publishEvent('user.registered', {
    user_id: user.user_id,
    username: user.username,
    email: user.email
  });
}

async function publishUserLoggedIn(user) {
  await publishEvent('user.logged_in', {
    user_id: user.user_id,
    username: user.username,
    email: user.email
  });
}

async function publishTokenRefreshed(user) {
  await publishEvent('token.refreshed', {
    user_id: user.user_id,
    username: user.username
  });
}

async function publishUserLoggedOut(userId) {
  await publishEvent('user.logged_out', {
    user_id: userId
  });
}

module.exports = {
  connectProducer,
  disconnectProducer,
  publishUserRegistered,
  publishUserLoggedIn,
  publishTokenRefreshed,
  publishUserLoggedOut
};
