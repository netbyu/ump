import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Database (Prisma uses DATABASE_URL from .env)

  // Asterisk ARI
  ari: {
    url: process.env.ARI_URL || 'http://localhost:8088',
    username: process.env.ARI_USERNAME || 'asterisk-mgmt',
    password: process.env.ARI_PASSWORD || 'your_ari_password_here',
    appName: process.env.ARI_APP_NAME || 'asterisk-mgmt',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
