const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('./database');
const { authRequired } = require('./middleware');

// POST /api/auth/register — créer un compte
router.post('/register', (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe minimum 8 caractères' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email déjà utilisé' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`
    INSERT INTO customers (email, password, first_name, last_name, phone)
    VALUES (?, ?, ?, ?, ?)
  `).run(email, hash, first_name || '', last_name || '', phone || '');

  const token = jwt.sign(
    { id: result.lastInsertRowid, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(201).json({ token, message: 'Compte créé avec succès' });
});

// POST /api/auth/login — connexion
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);

  if (!customer || !bcrypt.compareSync(password, customer.password)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const token = jwt.sign(
    { id: customer.id, email: customer.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password: _, ...customerData } = customer;
  res.json({ token, customer: customerData });
});

// GET /api/auth/me — profil connecté
router.get('/me', authRequired, (req, res) => {
  const db = getDb();
  const customer = db.prepare(
    'SELECT id, email, first_name, last_name, phone, address, city, postal_code, country, created_at FROM customers WHERE id = ?'
  ).get(req.user.id);

  if (!customer) return res.status(404).json({ error: 'Client non trouvé' });
  res.json(customer);
});

// PUT /api/auth/me — modifier le profil
router.put('/me', authRequired, (req, res) => {
  const { first_name, last_name, phone, address, city, postal_code } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE customers SET first_name=?, last_name=?, phone=?, address=?, city=?, postal_code=?
    WHERE id=?
  `).run(first_name, last_name, phone, address, city, postal_code, req.user.id);

  res.json({ message: 'Profil mis à jour' });
});

// GET /api/auth/orders — historique commandes du client
router.get('/orders', authRequired, (req, res) => {
  const db = getDb();
  const orders = db.prepare(`
    SELECT o.*, GROUP_CONCAT(oi.name || ' x' || oi.quantity) as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.user.id);

  res.json({ orders });
});

module.exports = router;
