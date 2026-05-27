import { io } from 'socket.io-client';

const socket = io('/', { autoConnect: false });

export function connectSocket(token) {
  if (socket.connected) return;
  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export function joinRoom(userId) {
  socket.emit('join', userId);
}

export function joinRoleRoom(role) {
  socket.emit('joinRole', role);
}

export default socket;
