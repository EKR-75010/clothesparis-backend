const express = require('express');
const router = express.Router();
const { getDb } = require('./database');

// GET /api/products — tous les produits (avec filtres)
router.get('/', (req, res) => {
  const db = getDb();
  const { brand, category, search, min_price, max_price, in_stock } = req.query;

  let sql = 'SELECT * FROM products WHERE active = 1';
  const params = [];

  if (brand) {
    sql += ' AND LOWER(brand) = LOWER(?)';
    params.push(brand);
  }
  if (category) {
    sql += ' AND LOWER(category) LIKE LOWER(?)';
    params.push(`%${category}%`);
  }
  if (search) {
    sql += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(brand) LIKE LOWER(?))';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (min_price) {
    sql += ' AND price >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    sql += ' AND price <= ?';
    params.push(parseFloat(max_price));
  }
  if (in_stock === 'true') {
    sql += ' AND stock > 0';
  }

  sql += ' ORDER BY created_at DESC';

  const products = db.prepare(sql).all(...params).map(p => ({
    ...p,
    sizes: JSON.parse(p.sizes || '[]'),
    colors: JSON.parse(p.colors || '[]')
  }));

  res.json({ products, total: products.length });
});

// GET /api/products/:id — un produit
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

  res.json({
    ...product,
    sizes: JSON.parse(product.sizes || '[]'),
    colors: JSON.parse(product.colors || '[]')
  });
});

// GET /api/products/:id/stock — vérifier le stock avant paiement
router.get('/:id/stock', (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT stock FROM products WHERE id = ? AND active = 1').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produit non trouvé' });
  res.json({ stock: p.stock, available: p.stock > 0 });
});

module.exports = router;
