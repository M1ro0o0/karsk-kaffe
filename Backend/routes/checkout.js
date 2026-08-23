const express = require("express");

const { calculateOrderTotal } = require("../utils/pricing");
const { createRevolutOrder } = require("../utils/revolut");
const { resolveDeliveryMethodKey } = require("../utils/shipmondo");

const { computeSku } = require("../utils/sku");
const { getZohoIdForSku } = require("../utils/zoho-sku-lookup");
const { getItem } = require("../utils/zoho");
const { createPendingOrder, releaseOrder } = require("../utils/order-reservation");

module.exports = (supabase) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const {
        cartItems,
        discountCode,
        shippingCost,
        customerEmail,
        customerName,
        billingAddress,
        shippingAddress,
        shippingMethod,
        pickupPoint,
        orderNote,
      } = req.body;

      // =========================
      // BASIC VALIDATION
      // =========================

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      if (!customerEmail || !customerName) {
        return res.status(400).json({ error: "Missing customer details" });
      }

      if (!billingAddress || !shippingAddress) {
        return res.status(400).json({ error: "Missing address details" });
      }

      if (!shippingMethod) {
        return res.status(400).json({ error: "Missing shipping method" });
      }

      // shippingMethod arrives from ShippingSelector.jsx as { provider: {id, ...}, method: {id, ...} }.
      // Resolve it to the plain DELIVERY_METHODS key Shipmondo needs *now*, at checkout time,
      // rather than discovering an invalid combination after payment when order-process.js
      // tries to book the shipment.
      let shippingMethodKey;

      try {
        shippingMethodKey = resolveDeliveryMethodKey(
          shippingMethod?.provider?.id,
          shippingMethod?.method?.id
        );
      } catch (shippingErr) {
        console.error("Invalid shipping method on checkout:", shippingErr.message);
        return res.status(400).json({ error: "Invalid shipping method selected." });
      }

      // =========================
      // LOAD PRODUCT OPTIONS
      // =========================

      const { data: optionsFromDb, error: optionsError } = await supabase
        .from("ProductOptions")
        .select("*");

      if (optionsError) {
        throw new Error(`Failed to load product options: ${optionsError.message}`);
      }

      // =========================
      // CHECK STOCK
      // (This is now an advisory/UX check only — for a fast, friendly error message.
      // The real enforcement point is confirming the Zoho sales order below, which
      // is the atomic moment Zoho itself would reject an oversell.)
      // =========================

      for (const item of cartItems) {
        let sku;

        try {
          sku = computeSku(item.id, item.options || {}, optionsFromDb);
        } catch (skuError) {
          throw new Error(`Could not determine SKU for ${item.name}: ${skuError.message}`);
        }

        const zohoId = await getZohoIdForSku(supabase, sku);

        if (!zohoId) {
          throw new Error(`Product ${item.name} is currently unavailable.`);
        }

        const stockItem = await getItem(zohoId);

        const availableStock = Number(
          stockItem?.available_for_sale_stock ??
          stockItem?.available_stock ??
          stockItem?.stock_on_hand ??
          0
        );

        const requestedQuantity = Number(item.quantity);

        if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
          throw new Error(`Invalid quantity for ${item.name}.`);
        }

        if (availableStock < requestedQuantity) {
          if (availableStock === 0) {
            throw new Error(`${item.name} is no longer available.`);
          }
          throw new Error(`Only ${availableStock} of ${item.name} are available, but ${requestedQuantity} were requested.`);
        }
      }

      // =========================
      // CALCULATE ORDER TOTAL
      // =========================

      const { totalInMinorUnits, total, discountAmount } = await calculateOrderTotal(
        cartItems,
        discountCode,
        shippingCost || 0
      );

      // =========================
      // CREATE PENDING ORDER + RESERVE STOCK IN ZOHO
      // Delegated to order-reservation.js so this stays the single implementation of the
      // pending-order/reservation lifecycle (createPendingOrder logs the order, then creates
      // + confirms a Zoho sales order that commits these items so they can't be sold to anyone
      // else while this customer is on the payment page). If the Zoho reservation fails,
      // createPendingOrder already marks the order "reservation_failed" and throws.
      // =========================

      let pendingOrder;

      try {
        pendingOrder = await createPendingOrder(
          {
            customerEmail,
            customerName,
            cartItems,
            discount: discountCode
              ? { code: discountCode, amount: Number(discountAmount.toFixed(2)) }
              : null,
            shippingCost: shippingCost || 0,
            totalAmount: total,
            billingAddress,
            shippingAddress,
            shippingMethod: shippingMethodKey,
            pickupPoint: pickupPoint || null,
            orderNote: orderNote || null,
          },
          supabase
        );
      } catch (reservationErr) {
        console.error("Order reservation failed:", reservationErr);

        return res.status(409).json({
          error: "One or more items in your cart just went out of stock. Please review your cart and try again.",
        });
      }

      // =========================
      // CREATE REVOLUT ORDER
      // =========================

      let revolutOrder;

      try {
        revolutOrder = await createRevolutOrder({
          amount: totalInMinorUnits,
          currency: "DKK",
          customerEmail,
          customerName,
          merchantOrderExtRef: pendingOrder.id,
        });
      } catch (revolutErr) {
        console.error(`Revolut order creation failed for order ${pendingOrder.id}:`, revolutErr);

        // Don't leave stock reserved for a payment session that never got created.
        try {
          await releaseOrder(pendingOrder, supabase, "checkout_failed");
        } catch (releaseErr) {
          console.error(`Failed to release order ${pendingOrder.id} after Revolut failure:`, releaseErr);
        }

        return res.status(502).json({ error: "Could not start payment. Please try again." });
      }

      await supabase
        .from("Orders")
        .update({ revolutOrderId: revolutOrder.id })
        .eq("id", pendingOrder.id);

      // =========================
      // RESPONSE
      // =========================

      res.json({
        checkoutUrl: revolutOrder.checkout_url,
        orderId: pendingOrder.id,
      });

    } catch (err) {
      console.error("Checkout error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};