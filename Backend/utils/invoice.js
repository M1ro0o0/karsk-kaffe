const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

async function generateInvoicePdf(order) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brown = rgb(0x8f / 255, 0x54 / 255, 0x45 / 255);
  const darkText = rgb(0.2, 0.2, 0.2);
  const grayText = rgb(0.45, 0.45, 0.45);
  const lightGrayText = rgb(0.55, 0.55, 0.55);

  let y = height - 60;

  // =========================
  // LOGO
  // =========================
  const logoPath = path.join(__dirname, "..", "assets", "logo-inv.png");
  let logoHeight = 0;

  if (fs.existsSync(logoPath)) {
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    const logoWidth = 110;
    logoHeight = (logoImage.height / logoImage.width) * logoWidth;

    page.drawImage(logoImage, {
      x: 50,
      y: y - logoHeight + 10,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    page.drawText("Karsk Kaffe", {
      x: 50,
      y,
      size: 22,
      font: bold,
      color: brown,
    });

    logoHeight = 22;
  }

  // =========================
  // INVOICE HEADER (RIGHT)
  // =========================
  const headerX = width - 160;

  page.drawText("FAKTURA", {
    x: headerX,
    y: height - 60,
    size: 20,
    font: bold,
    color: darkText,
  });

  page.drawText(`Ordre #${order.orderID}`, {
    x: headerX,
    y: height - 80,
    size: 10,
    font,
    color: grayText,
  });

  page.drawText(new Date(order.createdAt).toLocaleDateString("da-DK"), {
    x: headerX,
    y: height - 94,
    size: 10,
    font,
    color: grayText,
  });

  // =========================
  // COMPANY INFO (UNDER HEADER)
  // =========================
  let companyY = height - 120;

  const companyLines = [
    "Karsk Kaffe",
    "Ellegårdvej 18C",
    "6400 Sønderborg",
    "Danmark",
    "",
    "CVR: 46 27 60 43",
    "Moms/VAT nr.: DK46276043",
  ];

  companyLines.forEach((line) => {
    if (line) {
      page.drawText(line, {
        x: headerX,
        y: companyY,
        size: 9,
        font,
        color: grayText,
      });
    }

    companyY -= 12;
  });

  // =========================
  // BILLING INFO (UNDER LOGO)
  // =========================
  let customerY = y - logoHeight - 25;

  page.drawText("Faktureres til:", {
    x: 50,
    y: customerY,
    size: 11,
    font: bold,
    color: darkText,
  });

  customerY -= 16;

  const b = order.billingAddress;

  [
    `${b.firstName} ${b.lastName}`,
    b.address,
    `${b.postalCode} ${b.city}`,
    b.country,
    b.email,
  ].forEach((line) => {
    page.drawText(line, {
      x: 50,
      y: customerY,
      size: 10,
      font,
      color: grayText,
    });

    customerY -= 14;
  });

  // =========================
  // DETERMINE TABLE START POSITION
  // =========================
  y = Math.min(customerY, companyY) - 25;

  // =========================
  // TABLE HEADER
  // =========================
  page.drawRectangle({
    x: 50,
    y: y - 6,
    width: width - 100,
    height: 22,
    color: rgb(0.95, 0.92, 0.9),
  });

  page.drawText("Vare", {
    x: 56,
    y,
    size: 10,
    font: bold,
    color: darkText,
  });

  page.drawText("Antal", {
    x: 250,
    y,
    size: 10,
    font: bold,
    color: darkText,
  });

  page.drawText("Pris ekskl.", {
    x: 300,
    y,
    size: 10,
    font: bold,
    color: darkText,
  });

  page.drawText("Moms", {
    x: 405,
    y,
    size: 10,
    font: bold,
    color: darkText,
  });

  page.drawText("I alt", {
    x: 475,
    y,
    size: 10,
    font: bold,
    color: darkText,
  });

  y -= 28;

  // =========================
  // LINE ITEMS
  // =========================
  const VAT_RATE = 0.25;

  for (const item of order.cartItems) {
    const unitPriceIncl = item.selectedPrice?.price ?? item.price;

    const unitPriceExcl = unitPriceIncl / (1 + VAT_RATE);

    const unitVat = unitPriceIncl - unitPriceExcl;

    const lineTotalIncl = unitPriceIncl * item.quantity;

    const lineVat = unitVat * item.quantity;

    page.drawText(item.name, {
      x: 56,
      y,
      size: 10,
      font,
      color: darkText,
    });

    page.drawText(String(item.quantity), {
      x: 250,
      y,
      size: 10,
      font,
      color: darkText,
    });

    page.drawText(`${unitPriceExcl.toFixed(2)} kr`, {
      x: 300,
      y,
      size: 10,
      font,
      color: darkText,
    });

    page.drawText(`${lineVat.toFixed(2)} kr`, {
      x: 405,
      y,
      size: 10,
      font,
      color: darkText,
    });

    page.drawText(`${lineTotalIncl.toFixed(2)} kr`, {
      x: 475,
      y,
      size: 10,
      font,
      color: darkText,
    });

    y -= 18;

    const optionsText = Object.entries(item.options || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("  ·  ");

    if (optionsText) {
      page.drawText(optionsText, {
        x: 56,
        y,
        size: 8,
        font,
        color: grayText,
      });

      y -= 16;
    }
  }

  y -= 10;

  page.drawLine({
    start: {
      x: 50,
      y,
    },
    end: {
      x: width - 50,
      y,
    },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 24;

  // =========================
  // TOTALS
  // =========================
  const drawTotalRow = (label, value, isBold = false) => {
    const labelWidth = font.widthOfTextAtSize(label, 10);

    page.drawText(label, {
      x: 350,
      y,
      size: 10,
      font: isBold ? bold : font,
      color: darkText,
    });

    page.drawText(value, {
      x: 480,
      y,
      size: 10,
      font: isBold ? bold : font,
      color: darkText,
    });

    y -= 18;
  };

  if (order.discount?.code) {
    drawTotalRow(`Rabat kode (${order.discount.code})`, "anvendt");

    drawTotalRow("Rabat", `- ${Number(order.discount.amount).toFixed(2)} kr`);
  }

  drawTotalRow("Fragt", `${order.shippingCost} kr`);

  const totalExclVat = order.totalAmount / (1 + VAT_RATE);

  const vatAmount = order.totalAmount - totalExclVat;

  drawTotalRow("I alt ekskl. moms", `${totalExclVat.toFixed(2)} kr`);

  drawTotalRow("Moms (25%)", `${vatAmount.toFixed(2)} kr`);

  drawTotalRow("I alt inkl. moms", `${order.totalAmount} kr`, true);

  // =========================
  // REFUND / CLAIM NOTICE
  // =========================

  y -= 35;

  const noticeLines = [
    "Reklamation",
    `Hvis din ordre (#${order.orderID}) er ankommet beskadiget eller ikke er komplet,`,
    "kan du gøre krav på refusion eller kompensation ved at kontakte os på",
    "return@karskkaffe.dk.",
  ];

  noticeLines.forEach((line, i) => {
    const size = i === 0 ? 10 : 9;
    const usedFont = i === 0 ? bold : font;

    const textWidth = usedFont.widthOfTextAtSize(line, size);

    page.drawText(line, {
      x: (width - textWidth) / 2,
      y,
      size,
      font: usedFont,
      color: i === 0 ? darkText : grayText,
    });

    y -= i === 0 ? 16 : 13;
  });
  // =========================
  // FOOTER
  // =========================
  const footerLines = [
    "Karsk Kaffe v/Miroslav Andrejcak",
    "Ellegårdvej 18C • 6400 Sønderborg • Danmark",
    "CVR: 46276043 • Moms/VAT nr.: DK46276043",
    "info@karskkaffe.dk • www.karskkaffe.dk",
  ];

  let footerY = 45;

  footerLines.forEach((line) => {
    const textWidth = font.widthOfTextAtSize(line, 8);

    page.drawText(line, {
      x: (width - textWidth) / 2,
      y: footerY,
      size: 8,
      font,
      color: lightGrayText,
    });

    footerY -= 11;
  });

  // =========================
  // EXPORT PDF
  // =========================
  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
}

module.exports = {
  generateInvoicePdf,
};
