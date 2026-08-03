const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Karsk Kaffe <noreply@send.karskkaffe.dk>";
const BRAND_COLOR = "#8F5445";
const MUTED_COLOR = "#8a8a8a";

/* =========================================================
   SHARED LAYOUT — wraps every email with header/footer/signature
   ========================================================= */
function wrapEmail({ bodyHtml, schemaJsonLd = null }) {
  return `
  <html>
  <head>
    <meta charset="utf-8" />
    ${schemaJsonLd ? `<script type="application/ld+json">${JSON.stringify(schemaJsonLd)}</script>` : ""}
  </head>
  <body style="margin:0; padding:0; background:#faf7f5; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:600px; margin:0 auto; padding:32px 24px;">

      <div style="text-align:center; margin-bottom:28px;">
        <span style="font-size:22px; font-weight:bold; color:${BRAND_COLOR};">Karsk Kaffe</span>
      </div>

      <div style="background:#ffffff; border-radius:12px; padding:32px; color:#3a2a22;">
        ${bodyHtml}
      </div>

      <div style="text-align:center; margin-top:28px; padding-top:20px; border-top:1px solid #e6dcd7; color:${MUTED_COLOR}; font-size:12px; line-height:1.6;">
        <p style="margin:0 0 6px;"><strong style="color:${BRAND_COLOR};">Karsk Kaffe</strong></p>
        <p style="margin:0;">karskkaffe.dk &nbsp;·&nbsp; orders@karskkaffe.dk</p>
        <p style="margin:8px 0 0;">Danmark</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/* =========================================================
   BILINGUAL TEXT BLOCK
   Danish dominant, English translation directly beneath in grey
   ========================================================= */
function bilingual(danishHtml, englishHtml) {
  return `
    <p style="margin:0 0 4px; font-size:15px; line-height:1.5;">${danishHtml}</p>
    <p style="margin:0 0 18px; font-size:13px; line-height:1.5; color:${MUTED_COLOR};">${englishHtml}</p>
  `;
}

/* =========================================================
   ORDER OVERVIEW TABLE (used in confirmation + owner alert)
   ========================================================= */
function orderOverviewTable(order) {
  const rows = order.cartItems.map(item => {
    const unitPrice = item.selectedPrice?.price ?? item.price;
    const optionsText = Object.entries(item.options || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
    return `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #f0e8e4;">
          <div style="font-weight:bold; font-size:14px;">${item.name}</div>
          ${optionsText ? `<div style="font-size:12px; color:${MUTED_COLOR};">${optionsText}</div>` : ""}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #f0e8e4; text-align:center; font-size:14px;">${item.quantity}</td>
        <td style="padding:10px 0; border-bottom:1px solid #f0e8e4; text-align:right; font-size:14px;">${unitPrice * item.quantity} kr</td>
      </tr>
    `;
  }).join("");

  return `
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <thead>
        <tr>
          <th style="text-align:left; font-size:12px; color:${MUTED_COLOR}; padding-bottom:6px;">Vare / Item</th>
          <th style="text-align:center; font-size:12px; color:${MUTED_COLOR}; padding-bottom:6px;">Antal / Qty</th>
          <th style="text-align:right; font-size:12px; color:${MUTED_COLOR}; padding-bottom:6px;">Pris / Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right; font-size:13px; color:${MUTED_COLOR}; margin-top:4px;">Fragt / Shipping: ${order.shippingCost} kr</div>
    <div style="text-align:right; font-size:17px; font-weight:bold; color:${BRAND_COLOR}; margin-top:6px;">Total: ${order.totalAmount} kr</div>
  `;
}

/* =========================================================
   1. ORDER CONFIRMATION + INVOICE (to the customer)
   ========================================================= */
async function sendOrderConfirmation(order, invoicePdfBuffer) {
  const body = `
    <h1 style="font-size:20px; color:${BRAND_COLOR}; margin:0 0 20px;">Tak for din ordre!</h1>

    ${bilingual(
      `Hej ${order.customerName}, tak for din bestilling hos Karsk Kaffe. Din betaling på <strong>${order.totalAmount} kr</strong> er blevet gennemført.`,
      `Hi ${order.customerName}, thank you for your order with Karsk Kaffe. Your payment of <strong>${order.totalAmount} kr</strong> was successful.`
    )}

    ${bilingual(
      `Din faktura er vedhæftet denne email.`,
      `Your invoice is attached to this email.`
    )}

    ${orderOverviewTable(order)}

    ${bilingual(
      `Vi sender dig en ny email med sporingsoplysninger, så snart din ordre er afsendt.`,
      `We'll send you another email with tracking details once your order ships.`
    )}
  `;

  const schemaJsonLd = {
    "@context": "http://schema.org",
    "@type": "Order",
    "merchant": { "@type": "Organization", "name": "Karsk Kaffe" },
    "orderNumber": order.id,
    "priceCurrency": "DKK",
    "price": String(order.totalAmount),
    "orderStatus": "http://schema.org/OrderProcessing",
    "orderDate": order.createdAt,
    "acceptedOffer": order.cartItems.map(item => ({
      "@type": "Offer",
      "itemOffered": { "@type": "Product", "name": item.name },
      "price": String((item.selectedPrice?.price ?? item.price) * item.quantity),
      "priceCurrency": "DKK",
      "eligibleQuantity": { "@type": "QuantitativeValue", "value": item.quantity }
    }))
  };

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: order.customerEmail,
    reply_to: "info@karskkaffe.dk",
    subject: `Ordrebekræftelse / Order confirmation — #${order.id}`,
    html: wrapEmail({ bodyHtml: body, schemaJsonLd }),
    attachments: [
      { filename: `invoice-${order.id}.pdf`, content: invoicePdfBuffer.toString("base64") },
    ],
  });
}

/* =========================================================
   2. NEW ORDER ALERT (to you) — invoice + shipping label attached
   ========================================================= */
async function sendNewOrderAlert(order, { invoicePdfBuffer, labelPdfBuffer, trackingNumber } = {}) {
  const body = `
    <h1 style="font-size:20px; color:${BRAND_COLOR}; margin:0 0 20px;">🛒 Ny ordre modtaget</h1>
    <p style="font-size:14px; margin:0 0 4px;"><strong>Kunde:</strong> ${order.customerName} (${order.customerEmail})</p>
    <p style="font-size:14px; margin:0 0 4px;"><strong>Levering:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.postalCode} ${order.shippingAddress.city}</p>
    ${trackingNumber ? `<p style="font-size:14px; margin:0 0 18px;"><strong>Tracking:</strong> ${trackingNumber}</p>` : `<div style="margin-bottom:18px;"></div>`}
    ${orderOverviewTable(order)}
  `;

  const attachments = [];
  if (invoicePdfBuffer) {
    attachments.push({ filename: `invoice-${order.id}.pdf`, content: invoicePdfBuffer.toString("base64") });
  }
  if (labelPdfBuffer) {
    attachments.push({ filename: `label-${order.id}.pdf`, content: labelPdfBuffer.toString("base64") });
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: "orders@karskkaffe.dk",
    subject: `🛒 Ny ordre — #${order.id}`,
    html: wrapEmail({ bodyHtml: body }),
    attachments,
  });
}

/* =========================================================
   3. SHIPPING UPDATE
   ========================================================= */
async function sendShippingUpdate(order) {
  const body = `
    <h1 style="font-size:20px; color:${BRAND_COLOR}; margin:0 0 20px;">Din ordre er på vej!</h1>

    ${bilingual(
      `Hej ${order.customerName}, din ordre er nu afsendt.`,
      `Hi ${order.customerName}, your order has now shipped.`
    )}

    ${order.trackingURL ? `
      <div style="text-align:center; margin:24px 0;">
        <a href="${order.trackingURL}" style="background:${BRAND_COLOR}; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px;">
          Spor din pakke / Track your delivery
        </a>
      </div>
    ` : ""}
  `;

  const schemaJsonLd = order.trackingURL ? {
    "@context": "http://schema.org",
    "@type": "ParcelDelivery",
    "trackingUrl": order.trackingURL,
    "orderNumber": order.id,
    "deliveryStatus": "http://schema.org/DeliveryInTransit"
  } : null;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: order.customerEmail,
    reply_to: "orders@karskkaffe.dk",
    subject: `Din ordre er afsendt / Your order has shipped — #${order.id}`,
    html: wrapEmail({ bodyHtml: body, schemaJsonLd }),
  });
}

module.exports = { sendOrderConfirmation, sendNewOrderAlert, sendShippingUpdate };
