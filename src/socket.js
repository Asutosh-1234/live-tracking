import { Server } from 'socket.io';
import { kafkaClient } from '../kafka-client.js';

const kafkaProducer = kafkaClient.producer();

export async function initSocket(server, sessionMiddleware) {
  const io = new Server(server);

  await kafkaProducer.connect();

  io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res ?? {}, next));
  io.use((socket, next) => {
    const user = socket.request.session?.passport?.user;
    if (!user) return next(new Error('UNAUTHORIZED'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket:${socket.id}]: Connected Success...`);

    socket.on('client:location:update', async (locationData) => {
      const { latitude, longitude } = locationData;
      console.log(
        `[Socket:${socket.id}]:client:location:update:`,
        locationData,
      );

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        socket.emit('server:error', { message: 'Invalid location data' });
        return;
      }

      await kafkaProducer.send({
        topic: 'location-updates',
        messages: [
          {
            key: socket.user.id,
            value: JSON.stringify({
              userId: socket.user.id,
              latitude,
              longitude,
            }),
          },
        ],
      });
    });
  });

  return io;
}
