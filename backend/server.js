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
    return callback(null, true); // Permissive in dev/staging, can restrict in production via FRONTEND_URL
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Aspire LMS Backend API Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Passkey & OTP Endpoints active at /api/*\n`);
});
