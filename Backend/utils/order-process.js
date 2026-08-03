const { generateInvoicePdf } = require("./invoice");
const { createShipment } = require("./shipmondo");
const { createSalesOrder } = require("./zoho");
const { sendOrderConfirmation, sendNewOrderAlert } = require("./emails");

/**
 * Runs the full post-payment order flow:
 *  1. Generate the invoice PDF (once, reused by both emails)
 *  2. Create the shipment in Shipmondo -> get the shipping label
 *  3. Push the order into Zoho Inventory as a sales order
 *  4. Email the customer their confirmation + invoice
 *  5. Email you (orders@karskkaffe.dk) the new-order alert with invoice + label attached
 *
 * Shipmondo and Zoho run in parallel and are isolated with try/catch so that one failing
 * doesn't stop the other, or stop the customer's confirmation email from going out.
 */
async function processOrder(order, supabase) {
  const invoicePdfBuffer = await generateInvoicePdf(order);

  const [shipmentResult, salesOrderResult] = await Promise.allSettled([
    createShipment(order),
    createSalesOrder(order, supabase),
  ]);

  if (shipmentResult.status === "rejected") {
    console.error(`Shipmondo shipment failed for order ${order.id}:`, shipmentResult.reason);
  }
  if (salesOrderResult.status === "rejected") {
    console.error(`Zoho sales order failed for order ${order.id}:`, salesOrderResult.reason);
  }

  const shipment = shipmentResult.status === "fulfilled" ? shipmentResult.value : null;
  const salesOrder = salesOrderResult.status === "fulfilled" ? salesOrderResult.value : null;

  await sendOrderConfirmation(order, invoicePdfBuffer);

  await sendNewOrderAlert(order, {
    invoicePdfBuffer,
    labelPdfBuffer: shipment?.labelPdfBuffer ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
  });

  return { shipment, salesOrder };
}

module.exports = { processOrder };