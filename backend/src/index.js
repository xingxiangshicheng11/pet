import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import config from './config/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { startWorkers } from './jobs/worker.js';
import authRoutes from './routes/auth.js';
import petRoutes from './routes/pets.js';
import serviceRoutes from './routes/services.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import paymentRoutes from './routes/payments.js';
import serviceProductRoutes from './routes/serviceProducts.js';
import sitterRoutes from './routes/sitter.js';
import ownerRoutes from './routes/owner.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null, retryStrategy: t => t > 3 ? null : Math.min(t * 200, 2000) });
const subClient = pubClient.duplicate();
pubClient.on('error', () => {});
subClient.on('error', () => {});
io.adapter(createAdapter(pubClient, subClient));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', serviceProductRoutes);
app.use('/api/sitter', sitterRoutes);
app.use('/api/owner', ownerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'user:', socket.user?.id);

  socket.on('join', (userId) => {
    if (socket.user?.id == userId) {
      socket.join('user:' + userId);
    }
  });

  socket.on('joinRole', (role) => {
    const userRoles = (socket.user?.roles || '').split(',');
    if (role === 'SITTER' && userRoles.includes('SITTER')) socket.join('sitters');
    if (role === 'ADMIN' && userRoles.includes('ADMIN')) socket.join('admin');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

startWorkers(io);

server.listen(config.port, () => {
  console.log('Server running on port ' + config.port);
});
