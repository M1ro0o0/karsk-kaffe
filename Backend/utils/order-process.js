const { generateInvoicePdf } = require("./invoice");
const { createShipment } = require("./shipmondo");
const { createSalesOrder } = require("./zoho");
const { sendOrderConfirmation, sendNewOrderAlert } = require("./emails");
const { generateOrderNumber } = require("./invoice-number-generation");

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
  if (order.invoiceNumber) {
    console.log(`Order ${order.id} already processed as ${order.orderNumber}`);
    return;
  }

  // Generate invoice/order number only after successful payment
  const invoiceNumber = await generateInvoiceNumber(supabase);

  await supabase
    .from("Orders")
    .update({
      invoiceNumber,
      status: "paid",
    })
    .eq("id", order.id);

  // Update local object so the rest of the process uses it
  order.invoiceNumber = invoiceNumber;

  const invoicePdfBuffer = await generateInvoicePdf(order);

  const [shipmentResult, salesOrderResult] = await Promise.allSettled([
    createShipment(order),
    createSalesOrder(order, supabase),
  ]);

  if (shipmentResult.status === "rejected") {
    console.error(
      `Shipmondo shipment failed for order ${order.id}:`,
      shipmentResult.reason,
    );
  }
  if (salesOrderResult.status === "rejected") {
    console.error(
      `Zoho sales order failed for order ${order.id}:`,
      salesOrderResult.reason,
    );
  }

  const shipment =
    shipmentResult.status === "fulfilled" ? shipmentResult.value : null;
  const salesOrder =
    salesOrderResult.status === "fulfilled" ? salesOrderResult.value : null;

  await sendOrderConfirmation(order, invoicePdfBuffer);

  await sendNewOrderAlert(order, {
    invoicePdfBuffer,
    labelPdfBuffer: shipment?.labelPdfBuffer ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
  });

  return { shipment, salesOrder };
}

module.exports = { processOrder };
