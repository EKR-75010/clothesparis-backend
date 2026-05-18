const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendOrderConfirmation(order, items) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${item.name}${item.size ? ` — T.${item.size}` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">x${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">${(item.unit_price * item.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      
      <div style="background:#111;padding:24px;text-align:center">
        <h1 style="color:#c9a84c;margin:0;font-size:1.5rem;letter-spacing:.1em">CLOTHES<span style="color:#fff">PARIS</span></h1>
      </div>

      <div style="padding:32px 24px">
        <h2 style="font-size:1.2rem">Commande confirmée ✅</h2>
        <p>Bonjour, merci pour votre commande !</p>
        <p><strong>Référence :</strong> ${order.order_ref}</p>

        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="background:#f8f8f8">
              <th style="padding:10px 8px;text-align:left;font-size:.85rem">Article</th>
              <th style="padding:10px 8px;text-align:center;font-size:.85rem">Qté</th>
              <th style="padding:10px 8px;text-align:right;font-size:.85rem">Prix</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px 8px;text-align:right;font-size:.9rem">Livraison</td>
              <td style="padding:12px 8px;text-align:right">${order.shipping_cost === 0 ? 'Offerte' : order.shipping_cost.toFixed(2) + ' €'}</td>
            </tr>
            <tr style="font-weight:bold;font-size:1.05rem">
              <td colspan="2" style="padding:12px 8px;text-align:right">Total</td>
              <td style="padding:12px 8px;text-align:right;color:#c9a84c">${order.total.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size:.85rem;color:#666">
          Vous recevrez un email d'expédition avec le numéro de suivi dès que votre commande sera préparée.<br>
          Délai estimé : <strong>2 à 4 jours ouvrés</strong>.
        </p>

        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-top:24px;font-size:.85rem">
          <strong>Livraison à :</strong><br>
          ${order.shipping_addr ? (() => { try { const a = JSON.parse(order.shipping_addr); return `${a.first_name} ${a.last_name}<br>${a.address}<br>${a.postal_code} ${a.city}`; } catch { return ''; } })() : ''}
        </div>
      </div>

      <div style="background:#f8f8f8;padding:16px;text-align:center;font-size:.75rem;color:#999">
        ClothesParis — Paris, France<br>
        <a href="mailto:contact@clothesparis.fr" style="color:#c9a84c">contact@clothesparis.fr</a>
      </div>

    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.customer_email,
    bcc: process.env.SMTP_USER, // Copie au vendeur
    subject: `✅ Commande ${order.order_ref} confirmée — ClothesParis`,
    html
  });
}

module.exports = { sendOrderConfirmation };
