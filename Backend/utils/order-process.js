const { generateInvoicePdf } = require("./invoice");
const { createShipment } = require("./shipmondo");
const { finalizeSalesOrder } = require("./zoho");
const { sendOrderConfirmation, sendNewOrderAlert } = require("./emails");
const { generateInvoiceNumber } = require("./invoice-number-generation");

/**
 * @param {object} order - fetched fresh from the DB by the caller (webhooks.js) —
 *   don't pass a stale copy, since the "already paid" guard depends on it.
 * @param {object} supabase
 */
async function processOrder(order, supabase) {

  if (order.status === "paid") {
    console.log(`Order ${order.id} already processed as paid.`);
    return;
  }

  const invoiceNumber = await generateInvoiceNumber(supabase);

  const { error: paidUpdateError } = await supabase
    .from("Orders")
    .update({ status: "paid", invoiceNumber })
    .eq("id", order.id);

  if (paidUpdateError) {
    throw new Error(`Failed to mark order ${order.id} as paid: ${JSON.stringify(paidUpdateError)}`);
  }

  order.status = "paid";
  order.invoiceNumber = invoiceNumber;

  const invoicePdfBuffer = await generateInvoicePdf(order);

  let shipment = null;

  try {
    shipment = await createShipment(order);

    const { error: shipmentUpdateError } = await supabase
      .from("Orders")
      .update({
        trackingURL: shipment.trackingUrl,
        shipmondoShipmentID: shipment.shipmentId
      })
      .eq("id", order.id);

    if (shipmentUpdateError) {
      console.error(`Failed to save shipment info for order ${order.id}:`, shipmentUpdateError);
    }
  } catch (err) {
    console.error(`Shipmondo shipment failed for order ${order.id}:`, err);
  }

  try {
    await finalizeSalesOrder(order, supabase, {
      trackingNumber: shipment?.trackingNumber
    });
  } catch (err) {
    console.error(`Zoho finalize failed for order ${order.id}:`, err);
  }

  try {
    await sendOrderConfirmation(order, invoicePdfBuffer);
  } catch (err) {
    console.error(`Customer confirmation email failed for order ${order.id}:`, err);
  }

  try {
    await sendNewOrderAlert(order, {
      invoicePdfBuffer,
      labelPdfBuffer: shipment?.labelPdfBuffer ?? null,
      trackingNumber: shipment?.trackingNumber ?? null
    });
  } catch (err) {
    console.error(`Internal order alert failed for order ${order.id}:`, err);
  }

  return { shipment };
}

module.exports = { processOrder };