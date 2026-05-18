require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ── SÉCURITÉ ──────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting — 100 requêtes / 15 minutes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes' }
});
app.use('/api/', limiter);

// Rate limiting plus strict pour l'auth — 10 tentatives / 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── BODY PARSER ───────────────────────────────────────────────────────
// Note: le webhook Stripe doit recevoir le body RAW — avant express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));

// ── ROUTES ────────────────────────────────────────────────────────────
app.use('/api/products',  require('./products'));
app.use('/api/auth',      require('./auth'));
app.use('/api/payments',  require('./payments'));


// ── SANTÉ ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ── ERREURS ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ClothesParis API démarrée`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Env     : ${process.env.NODE_ENV}`);
  console.log(`   Base DB : ${process.env.DB_PATH || './db/clothesparis.db'}`);
  console.log(`\n   Routes disponibles:`);
  console.log(`   GET    /api/products`);
  console.log(`   GET    /api/products/:id`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/me`);
  console.log(`   POST   /api/payments/create-intent`);
  console.log(`   POST   /api/payments/webhook`);
  console.log(`   GET    /api/payments/order/:ref\n`);
});
