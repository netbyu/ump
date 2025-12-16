import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AriService } from './ari';

/**
 * Real-time service - WebSocket handling for live updates
 */
export class RealtimeService {
  private io: SocketServer;
  private ariService: AriService;

  constructor(io: SocketServer, ariService: AriService) {
    this.io = io;
    this.ariService = ariService;
  }

  initialize(): void {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        (socket as any).user = decoded;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user to their room
      const user = (socket as any).user;
      socket.join(`user:${user.userId}`);

      // Handle subscription to channels
      socket.on('subscribe:channels', () => {
        socket.join('channels');
        logger.debug(`${socket.id} subscribed to channels`);
      });

      socket.on('unsubscribe:channels', () => {
        socket.leave('channels');
      });

      // Handle subscription to extension status
      socket.on('subscribe:extensions', () => {
        socket.join('extensions');
        logger.debug(`${socket.id} subscribed to extensions`);
      });

      socket.on('unsubscribe:extensions', () => {
        socket.leave('extensions');
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Forward ARI events to clients
    this.setupAriEventForwarding();
  }

  private setupAriEventForwarding(): void {
    // Channel events
    this.ariService.on('channelStart', (data) => {
      this.io.to('channels').emit('channel:start', data);
    });

    this.ariService.on('channelEnd', (data) => {
      this.io.to('channels').emit('channel:end', data);
    });

    this.ariService.on('channelStateChange', (data) => {
      this.io.to('channels').emit('channel:state', data);
    });

    // Device state (extension status)
    this.ariService.on('deviceStateChange', (data) => {
      this.io.to('extensions').emit('extension:state', data);
    });
  }

  // Emit to all connected clients
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Emit to specific user
  emitToUser(userId: number, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }
}
