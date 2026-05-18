const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getDb } = require('./database');
const { authOptional } = require('./middleware');
const { sendOrderConfirmation } = require('./mailer');
const { v4: uuidv4 } = require('uuid');

// POST /api/payments/create-intent — créer un PaymentIntent Stripe
router.post('/create-intent', authOptional, async (req, res) => {
  try {
    const { items, shipping_addr, customer_email } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    const db = getDb();

    // Vérifier le stock et calculer le total
    let total = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.product_id);

      if (!product) {
        return res.status(400).json({ error: `Produit introuvable: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour ${product.name} (disponible: ${product.stock})`
        });
      }

      total += product.price * item.quantity;
      validatedItems.push({ ...item, unit_price: product.price, name: product.name });
    }

    // Frais de livraison
    const shipping_cost = total >= 100 ? 0 : 5.99;
    const totalWithShipping = total + shipping_cost;

    // Créer le PaymentIntent Stripe (montant en centimes)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalWithShipping * 100),
      currency: 'eur',
      metadata: {
        customer_email: customer_email || (req.user ? req.user.email : 'guest'),
        items_count: items.length.toString()
      },
      automatic_payment_methods: { enabled: true }
    });

    // Pré-créer la commande en statut "pending"
    const orderRef = `CP-${new Date().getFullYear()}-${String(db.prepare('SELECT COUNT(*) as c FROM orders').get().c + 1).padStart(5, '0')}`;

    const orderResult = db.prepare(`
      INSERT INTO orders (order_ref, customer_id, customer_email, status, total, shipping_cost, stripe_pi_id, shipping_addr)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(
      orderRef,
      req.user ? req.user.id : null,
      customer_email || (req.user ? req.user.email : ''),
      totalWithShipping,
      shipping_cost,
      paymentIntent.id,
      JSON.stringify(shipping_addr || {})
    );

    // Insérer les lignes de commande
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, brand, size, color, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of validatedItems) {
      insertItem.run(orderResult.lastInsertRowid, item.product_id, item.name,
        item.brand, item.size, item.color, item.quantity, item.unit_price);
    }

    res.json({
      client_secret: paymentIntent.client_secret,
      order_ref: orderRef,
      total: totalWithShipping,
      shipping_cost,
      stripe_public_key: process.env.STRIPE_PUBLIC_KEY
    });

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook — Stripe webhook (paiement confirmé)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature invalid:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDb();

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const order = db.prepare('SELECT * FROM orders WHERE stripe_pi_id = ?').get(pi.id);

    if (order && order.status === 'pending') {
      // Mettre à jour le statut commande
      db.prepare("UPDATE orders SET status='paid', updated_at=datetime('now') WHERE stripe_pi_id=?").run(pi.id);

      // Décrémenter le stock
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      for (const item of items) {
        if (item.product_id) {
          db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
        }
      }

      // Envoyer l'email de confirmation
      try {
        await sendOrderConfirmation(order, items);
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }

      console.log(`✅ Commande ${order.order_ref} confirmée`);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    db.prepare("UPDATE orders SET status='cancelled', updated_at=datetime('now') WHERE stripe_pi_id=?").run(pi.id);
    console.log(`❌ Paiement échoué pour PI: ${pi.id}`);
  }

  res.json({ received: true });
});

// GET /api/payments/order/:ref — statut d'une commande (page confirmation)
router.get('/order/:ref', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE order_ref = ?').get(req.params.ref);
  if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order: { ...order, shipping_addr: JSON.parse(order.shipping_addr || '{}') }, items });
});

module.exports = router;
