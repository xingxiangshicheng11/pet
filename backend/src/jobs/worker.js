import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
};

export function startWorkers(io) {
  new Worker('notifications', async (job) => {
    const { event, room, data } = job.data;
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  }, {
    connection,
    concurrency: 5,
  });

  new Worker('admin-alerts', async (job) => {
    const { event, room, data } = job.data;
    io.to(room).emit(event, data);
  }, {
    connection,
    concurrency: 3,
  });
}
