require('dotenv').config();

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (Buffer.from(process.env.ENCRYPTION_KEY, 'hex').length !== 32) {
    console.error('ENCRYPTION_KEY must be a 32-byte value in hex (64 hex characters)');
    process.exit(1);
  }
}

validateEnv();

module.exports = {
  oauth: {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET },
},
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  encryptionKey: process.env.ENCRYPTION_KEY,
};
