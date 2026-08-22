/**
 * Pre-payment order lifecycle: logging the order, reserving stock in Zoho, and
 * releasing that reservation if payment doesn't go through.
 */

const { createSalesOrder, voidSalesOrder } = require("./zoho");

/**
 * Called when the customer proceeds to payment, before Revolut is shown.
 *  1. Logs the order in the DB with status "pending"
 *  2. Reserves the cart contents in Zoho (create + confirm the sales order)
 *
 * If the Zoho reservation fails, this throws and the caller should NOT proceed to
 * payment — show the customer an error and let them retry, rather than risk
 * overselling something Zoho couldn't actually reserve.
 *
 * @param {object} orderData - everything known about the order so far (cart items,
 *   customer info, shipping address, shipping cost, etc.)
 * @param {object} supabase
 * @returns {Promise<object>} the saved order row, including zohoOrderID/Number
 */
async function createPendingOrder(orderData, supabase) {

  const {
    data: order,
    error
  } = await supabase
    .from("Orders")
    .insert({
      ...orderData,
      status: "pending",
      createdAt: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log pending order: ${JSON.stringify(error)}`);
  }

  let salesOrder;

  try {
    salesOrder = await createSalesOrder(order, supabase);
  } catch (err) {
    await supabase
      .from("Orders")
      .update({ status: "reservation_failed" })
      .eq("id", order.id);

    throw new Error(`Zoho reservation failed for order ${order.id}: ${err.message}`);
  }

  const { error: updateError } = await supabase
    .from("Orders")
    .update({
      zohoOrderID: salesOrder.salesorder_id,
      zohoSalesOrderNumber: salesOrder.salesorder_number
    })
    .eq("id", order.id);

  if (updateError) {
    // The Zoho reservation exists but we failed to save its ID — log loudly, since
    // without this ID the order can never be released or finalized cleanly later.
    console.error(
      `CRITICAL: order ${order.id} reserved in Zoho as ${salesOrder.salesorder_id} but failed to save that ID:`,
      updateError
    );
  }

  return {
    ...order,
    zohoOrderID: salesOrder.salesorder_id,
    zohoSalesOrderNumber: salesOrder.salesorder_number
  };
}

/**
 * Releases a reservation — payment was abandoned, failed, or explicitly cancelled.
 * Safe to call even if the order was never successfully reserved in Zoho (e.g. the
 * reservation itself failed) — it just no-ops the Zoho call in that case.
 *
 * @param {object} order - must include id, and zohoOrderID if a reservation exists
 * @param {object} supabase
 * @param {string} [reason] - stored as the order's new status
 */
async function releaseOrder(order, supabase, reason = "abandoned") {

  if (order.zohoOrderID) {
    await voidSalesOrder(order.zohoOrderID);
  }

  const { error } = await supabase
    .from("Orders")
    .update({ status: reason })
    .eq("id", order.id);

  if (error) {
    throw new Error(`Failed to update order ${order.id} status to "${reason}": ${JSON.stringify(error)}`);
  }
}

/**
 * Cleanup sweep for orders where the customer closed the tab without Revolut ever
 * sending a cancellation event. Run this on a schedule (cron / scheduled function) —
 * nothing in this file wires up when it runs, since that depends on your infra.
 *
 * @param {object} supabase
 * @param {number} [olderThanMinutes] - pending orders older than this are released
 */
async function releaseStaleOrders(supabase, olderThanMinutes = 30) {

  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

  const {
    data: staleOrders,
    error
  } = await supabase
    .from("Orders")
    .select("*")
    .eq("status", "pending")
    .lt("createdAt", cutoff);

  if (error) {
    throw new Error(`Failed to load stale orders: ${JSON.stringify(error)}`);
  }

  for (const order of staleOrders) {
    try {
      await releaseOrder(order, supabase, "abandoned");
      console.log(`Released stale order ${order.id} (pending since ${order.createdAt})`);
    } catch (err) {
      console.error(`Failed to release stale order ${order.id}:`, err);
    }
  }
}

module.exports = {
  createPendingOrder,
  releaseOrder,
  releaseStaleOrders
};