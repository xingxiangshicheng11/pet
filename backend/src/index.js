import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import config from './config/index.js';
import authRoutes from './routes/auth.js';
import petRoutes from './routes/pets.js';
import serviceRoutes from './routes/services.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import paymentRoutes from './routes/payments.js';
import serviceProductRoutes from './routes/serviceProducts.js';
import sitterRoutes from './routes/sitter.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', serviceProductRoutes);
app.use('/api/sitter', sitterRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join('user:' + userId);
  });

  socket.on('joinRole', (role) => {
    if (role === 'SITTER') socket.join('sitters');
    if (role === 'ADMIN') socket.join('admin');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

server.listen(config.port, () => {
  console.log('Server running on port ' + config.port);
});
