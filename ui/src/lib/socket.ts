import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = useAuthStore.getState().token;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Hook for subscribing to real-time events
export function subscribeToChannels(
  onStart: (data: any) => void,
  onEnd: (data: any) => void,
  onState: (data: any) => void
): () => void {
  const socket = connectSocket();

  socket.emit('subscribe:channels');
  socket.on('channel:start', onStart);
  socket.on('channel:end', onEnd);
  socket.on('channel:state', onState);

  return () => {
    socket.emit('unsubscribe:channels');
    socket.off('channel:start', onStart);
    socket.off('channel:end', onEnd);
    socket.off('channel:state', onState);
  };
}

export function subscribeToExtensions(
  onStateChange: (data: { device: string; state: string }) => void
): () => void {
  const socket = connectSocket();

  socket.emit('subscribe:extensions');
  socket.on('extension:state', onStateChange);

  return () => {
    socket.emit('unsubscribe:extensions');
    socket.off('extension:state', onStateChange);
  };
}
