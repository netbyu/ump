import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Routes
import authRoutes from './routes/auth';
import extensionRoutes from './routes/extensions';
import queueRoutes from './routes/queues';
import cdrRoutes from './routes/cdr';
import voicemailRoutes from './routes/voicemail';
import systemRoutes from './routes/system';
import usersRoutes from './routes/users';

// Services
import { AriService } from './services/ari';
import { RealtimeService } from './services/realtime';

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time updates
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use('/api/extensions', authMiddleware, extensionRoutes);
app.use('/api/queues', authMiddleware, queueRoutes);
app.use('/api/cdr', authMiddleware, cdrRoutes);
app.use('/api/voicemail', authMiddleware, voicemailRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/users', authMiddleware, usersRoutes);

// Error handler
app.use(errorHandler);

// Initialize services
async function start() {
  try {
    // Connect to Asterisk ARI
    const ariService = AriService.getInstance();
    await ariService.connect();
    logger.info('Connected to Asterisk ARI');

    // Initialize real-time service with Socket.IO
    const realtimeService = new RealtimeService(io, ariService);
    realtimeService.initialize();
    logger.info('Real-time service initialized');

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`API server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
