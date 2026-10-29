require('./config/env'); // validates env vars first, before anything else can fail confusingly

const express = require('express');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const { initSockets } = require('./sockets');
const { recoverUnfinishedExecutions } = require('./runtime/replay');
require('./runtime/engine'); // side-effect: registers QueueEvents listeners -- must load before recovery can safely re-queue anything

const authRoutes = require('./routes/authRoutes');
const credentialRoutes = require('./routes/credentialRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const executionRoutes = require('./routes/executionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const httpServer = http.createServer(app); // Socket.io needs the raw http.Server, not just the Express app

app.use(helmet());
app.use(cors()); // dev-permissive; restrict `origin` to your real frontend URL before deploying
app.use(express.json());
app.use(cookieParser());

// Rate limiting only on auth -- this is the one surface a real attacker
// actually hits repeatedly (credential stuffing, brute force). The rest
// of the API is already behind JWT auth, which is the more meaningful
// gate there; blanket rate-limiting everywhere would mostly just risk
// throttling your own legitimate traffic during a demo.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts, please try again later' },
});
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(notFound);
app.use(errorHandler); // must be LAST — catches everything above it

async function startServer() {
  await connectDB();
  initSockets(httpServer);

  // Runs on every startup, not just after a real crash -- see
  // runtime/replay.js for why that's the correct, safe default.
  try {
    await recoverUnfinishedExecutions();
  } catch (err) {
    console.error('[ReplayEngine] Startup recovery failed (API will still start):', err);
  }

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Another API instance is running; stop it first.`);
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(config.port, () => {
    console.log(`🚀 FlowEngine API running on port ${config.port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});