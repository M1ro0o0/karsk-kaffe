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
        <p style="margin:0;">karskkaffe.dk &nbsp;·&nbsp; info@karskkaffe.dk</p>
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

/* =========================================================
   4. CONTACT FORM MESSAGE (to you, from the website contact form)
   ========================================================= */

const INBOX_MAP = {
  general: "info@karskkaffe.dk",
  complaint: "return@karskkaffe.dk",
  wholesale: "business@karskkaffe.dk",
  support: "support@karskkaffe.dk", // <-- confirm this address
};

const CONTACT_TYPE_LABELS = {
  general: "Generelt spørgsmål / General question",
  complaint: "Reklamation / ordreproblem / Complaint or order problem",
  wholesale: "Engros / Wholesale",
  support: "Kundeservice / Customer support",
};

// Text used on the visitor-facing receipt, keyed by site language.
// Anything not recognized falls back to English.
// NOTE: the sk/pl copy below is a first-pass translation — worth a native
// speaker's review before this goes out to real customers.
const RECEIPT_TEXT = {
  da: {
    subject: (typeLabel) => `Vi har modtaget din besked — ${typeLabel}`,
    heading: "Tak for din henvendelse",
    intro: (name) =>
      `Hej ${name}, vi har modtaget din besked og vender tilbage hurtigst muligt. Herunder er en kopi af det, du sendte til os.`,
    typeLabelPrefix: "Type:",
    orderLabelPrefix: "Ordre-/fakturanummer:",
    messageLabel: "Din besked:",
    outro: "Du behøver ikke at gøre noget videre — dette er blot en bekræftelse på, at vi har modtaget din henvendelse.",
  },
  en: {
    subject: (typeLabel) => `We've received your message — ${typeLabel}`,
    heading: "Thanks for reaching out",
    intro: (name) =>
      `Hi ${name}, we've received your message and will get back to you as soon as possible. Below is a copy of what you sent us.`,
    typeLabelPrefix: "Type:",
    orderLabelPrefix: "Order/invoice number:",
    messageLabel: "Your message:",
    outro: "No action needed on your part — this is just a confirmation that we've received your inquiry.",
  },
  sk: {
    subject: (typeLabel) => `Dostali sme vašu správu — ${typeLabel}`,
    heading: "Ďakujeme za vašu správu",
    intro: (name) =>
      `Ahoj ${name}, dostali sme vašu správu a čo najskôr sa vám ozveme. Nižšie nájdete kópiu toho, čo ste nám poslali.`,
    typeLabelPrefix: "Typ:",
    orderLabelPrefix: "Číslo objednávky/faktúry:",
    messageLabel: "Vaša správa:",
    outro: "Nemusíte nič ďalej robiť — toto je len potvrdenie, že sme vašu žiadosť prijali.",
  },
  pl: {
    subject: (typeLabel) => `Otrzymaliśmy Twoją wiadomość — ${typeLabel}`,
    heading: "Dziękujemy za kontakt",
    intro: (name) =>
      `Cześć ${name}, otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe. Poniżej znajduje się kopia tego, co do nas wysłałeś/aś.`,
    typeLabelPrefix: "Typ:",
    orderLabelPrefix: "Numer zamówienia/faktury:",
    messageLabel: "Twoja wiadomość:",
    outro: "Nie musisz nic więcej robić — to tylko potwierdzenie, że otrzymaliśmy Twoje zapytanie.",
  },
};

// Localized labels for the receipt, so the visitor only sees their own
// language rather than the bilingual staff-facing label.
const CONTACT_TYPE_LABELS_LOCALIZED = {
  da: {
    general: "Generelt spørgsmål",
    complaint: "Reklamation / ordreproblem",
    wholesale: "Engros",
    support: "Kundeservice",
  },
  en: {
    general: "General question",
    complaint: "Complaint or order problem",
    wholesale: "Wholesale",
    support: "Customer support",
  },
  sk: {
    general: "Všeobecná otázka",
    complaint: "Reklamácia / problém s objednávkou",
    wholesale: "Veľkoobchod",
    support: "Zákaznícka podpora",
  },
  pl: {
    general: "Pytanie ogólne",
    complaint: "Reklamacja / problem z zamówieniem",
    wholesale: "Hurt",
    support: "Obsługa klienta",
  },
};

// The frontend's LanguageContext already sends one of these exact keys
// ("en", "da", "sk", "pl"). Anything else (missing, malformed, future
// language not yet added here) falls back to English.
const SUPPORTED_LOCALES = ["en", "da", "sk", "pl"];
function resolveLocale(lang) {
  return SUPPORTED_LOCALES.includes(lang) ? lang : "en";
}

// Strips HTML special characters so visitor-submitted text can never
// be interpreted as markup/scripts inside the email.
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sends the internal notification to staff (bilingual, as before).
async function sendInternalContactAlert({ safeName, email, type, safeMessage, lang, safeOrderNumber, attachments }) {
  const recipient = INBOX_MAP[type] || INBOX_MAP.general;
  const typeLabel = CONTACT_TYPE_LABELS[type] || CONTACT_TYPE_LABELS.general;

  const body = `
    <h1 style="font-size:20px; color:${BRAND_COLOR}; margin:0 0 20px;">📩 Ny besked fra kontaktformular</h1>
    <p style="font-size:14px; margin:0 0 4px;"><strong>Navn:</strong> ${safeName}</p>
    <p style="font-size:14px; margin:0 0 4px;"><strong>Email:</strong> ${email}</p>
    <p style="font-size:14px; margin:0 0 4px;"><strong>Type:</strong> ${typeLabel}</p>
    ${safeOrderNumber ? `<p style="font-size:14px; margin:0 0 4px;"><strong>Ordre-/fakturanummer:</strong> ${safeOrderNumber}</p>` : ""}
    <p style="font-size:14px; margin:0 0 18px;"><strong>Sprog / Lang:</strong> ${lang || "n/a"}</p>
    <div style="background:#faf7f5; border-radius:8px; padding:16px; font-size:14px; line-height:1.6; white-space:pre-wrap;">${safeMessage}</div>
    ${attachments.length ? `<p style="font-size:12px; color:${MUTED_COLOR}; margin-top:16px;">📎 ${attachments.length} billede(r) vedhæftet / image(s) attached</p>` : ""}
  `;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: recipient,
    reply_to: email,
    subject: `📩 Kontaktformular: ${typeLabel} — ${safeName}`,
    html: wrapEmail({ bodyHtml: body }),
    attachments,
  });
}

// Sends a copy of the message back to the visitor, in the site's language,
// as a receipt confirming we received their inquiry.
async function sendContactReceipt({ safeName, email, type, safeMessage, lang, safeOrderNumber }) {
  const locale = resolveLocale(lang);
  const t = RECEIPT_TEXT[locale];
  const typeLabel = (CONTACT_TYPE_LABELS_LOCALIZED[locale] && CONTACT_TYPE_LABELS_LOCALIZED[locale][type])
    || CONTACT_TYPE_LABELS_LOCALIZED[locale].general;

  const body = `
    <h1 style="font-size:20px; color:${BRAND_COLOR}; margin:0 0 20px;">${t.heading}</h1>
    <p style="font-size:15px; line-height:1.5; margin:0 0 20px;">${t.intro(safeName)}</p>
    <p style="font-size:14px; margin:0 0 4px;"><strong>${t.typeLabelPrefix}</strong> ${typeLabel}</p>
    ${safeOrderNumber ? `<p style="font-size:14px; margin:0 0 4px;"><strong>${t.orderLabelPrefix}</strong> ${safeOrderNumber}</p>` : ""}
    <p style="font-size:14px; margin:18px 0 6px;"><strong>${t.messageLabel}</strong></p>
    <div style="background:#faf7f5; border-radius:8px; padding:16px; font-size:14px; line-height:1.6; white-space:pre-wrap; margin-bottom:18px;">${safeMessage}</div>
    <p style="font-size:13px; line-height:1.5; color:${MUTED_COLOR}; margin:0;">${t.outro}</p>
  `;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    reply_to: "info@karskkaffe.dk",
    subject: t.subject(typeLabel),
    html: wrapEmail({ bodyHtml: body }),
    // Intentionally no image attachments here — the visitor already has their own files.
  });
}

async function sendContactMessage({ name, email, type, message, lang, orderNumber, attachments = [] }) {
  const safeName = escapeHtml(name);
  const safeMessage = escapeHtml(message);
  const safeOrderNumber = orderNumber ? escapeHtml(orderNumber) : null;
  const safeType = INBOX_MAP[type] ? type : "general";

  await Promise.all([
    sendInternalContactAlert({ safeName, email, type: safeType, safeMessage, lang, safeOrderNumber, attachments }),
    sendContactReceipt({ safeName, email, type: safeType, safeMessage, lang, safeOrderNumber }),
  ]);
}

module.exports = { sendOrderConfirmation, sendNewOrderAlert, sendShippingUpdate, sendContactMessage };