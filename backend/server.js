/**
 * Aspire LMS — Standalone Production Backend Server
 * Run: npm start
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sendOtp = require('./routes/send-otp');
const verifyOtp = require('./routes/verify-otp');
const verifyPasskey = require('./routes/verify-passkey');
const getPasskey = require('./routes/get-passkey');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production & local development
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()) 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or listed origins
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // SEC-07: Strictly reject untrusted origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request Timeout Protection (12 seconds) ─────────────────────────────────
const REQUEST_TIMEOUT_MS = 12_000;

app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        ok: false,
        error: 'Gateway Timeout',
        message: `Request exceeded timeout threshold of ${REQUEST_TIMEOUT_MS}ms`,
      });
    }
  }, REQUEST_TIMEOUT_MS);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'aspire-lms-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.post('/api/send-otp', sendOtp);
app.post('/api/verify-otp', verifyOtp);
app.post('/api/verify-passkey', verifyPasskey);
app.post('/api/get-passkey', getPasskey);
app.get('/api/get-passkey', getPasskey);

// CORS error handler
app.use((err, req, res, next) => {
  if (err && (err.message === 'Not allowed by CORS' || err.message?.includes('CORS'))) {
    return res.status(403).json({ ok: false, error: 'Not allowed by CORS' });
  }
  next(err);
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Aspire LMS Backend API Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔐 Passkey & OTP Endpoints active at /api/*\n`);
  });
}

module.exports = app;
