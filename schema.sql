-- ── PRODUITS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  brand       TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  price       REAL    NOT NULL,
  price_old   REAL,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  image_url   TEXT,
  sizes       TEXT    DEFAULT '[]',   -- JSON array ["38","39","40","41","42"]
  colors      TEXT    DEFAULT '[]',   -- JSON array ["blanc","noir"]
  active      INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

-- ── CLIENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL UNIQUE,
  password     TEXT    NOT NULL,
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  postal_code  TEXT,
  country      TEXT    DEFAULT 'France',
  created_at   TEXT    DEFAULT (datetime('now'))
);

-- ── COMMANDES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref       TEXT    NOT NULL UNIQUE,  -- ex: CP-2024-00042
  customer_id     INTEGER REFERENCES customers(id),
  customer_email  TEXT    NOT NULL,         -- si commande invité
  status          TEXT    DEFAULT 'pending',
  -- pending | paid | shipped | delivered | cancelled | refunded
  total           REAL    NOT NULL,
  shipping_cost   REAL    DEFAULT 0,
  stripe_pi_id    TEXT,                     -- Stripe PaymentIntent ID
  shipping_addr   TEXT,                     -- JSON
  notes           TEXT,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now'))
);

-- ── LIGNES DE COMMANDE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  product_id  INTEGER REFERENCES products(id),
  name        TEXT    NOT NULL,
  brand       TEXT,
  size        TEXT,
  color       TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  REAL    NOT NULL
);

-- ── SESSIONS PANIER (invités) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_sessions (
  id          TEXT    PRIMARY KEY,   -- UUID
  data        TEXT    DEFAULT '[]',  -- JSON items
  expires_at  TEXT,
  created_at  TEXT    DEFAULT (datetime('now'))
);

-- ── INDEX ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_ref        ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_email      ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
