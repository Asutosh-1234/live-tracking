import { kafkaClient } from '../kafka-client.js';
import { pool } from './db.js';

export async function initConsumers(io, port) {
  const kafkaConsumer = kafkaClient.consumer({
    groupId: `socket-server-${port}`,
  });
  await kafkaConsumer.connect();
  await kafkaConsumer.subscribe({
    topics: ['location-updates'],
    fromBeginning: true,
  });

  kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`KafkaConsumer Data Received`, { data });
      io.emit('server:location:update', {
        id: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      await heartbeat();
    },
  });

  const kafkaDbConsumer = kafkaClient.consumer({ groupId: 'db-processor' });
  await kafkaDbConsumer.connect();
  await kafkaDbConsumer.subscribe({ topics: ['location-updates'], fromBeginning: false });
  kafkaDbConsumer.run({
    eachMessage: async ({ message, heartbeat }) => {
      try {
        const data = JSON.parse(message.value.toString());
        if (!data.userId || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
        await pool.query(
          `INSERT INTO location_history (user_id, latitude, longitude) VALUES ($1,$2,$3)`,
          [data.userId, data.latitude, data.longitude],
        );
        await heartbeat();
      } catch (err) {
        console.error('[DB Consumer]', err.message);
      }
    },
  });
}
