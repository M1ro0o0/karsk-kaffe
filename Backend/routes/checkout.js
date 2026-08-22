const express = require("express");

const { calculateOrderTotal } = require("../utils/pricing");
const { createRevolutOrder } = require("../utils/revolut");

const { computeSku } = require("../utils/sku");
const { getZohoIdForSku } = require("../utils/zoho-sku-lookup");
const { getItem, createSalesOrder, voidSalesOrder } = require("../utils/zoho");

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
      // CREATE PENDING ORDER
      // =========================

      const { data: pendingOrder, error: insertError } = await supabase
        .from("Orders")
        .insert({
          customerEmail,
          customerName,
          status: "pending",
          cartItems,
          discount: discountCode
            ? { code: discountCode, amount: Number(discountAmount.toFixed(2)) }
            : null,
          shippingCost: shippingCost || 0,
          totalAmount: total,
          billingAddress,
          shippingAddress,
          shippingMethod,
          pickupPoint: pickupPoint || null,
          orderNote: orderNote || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create pending order: ${insertError.message}`);
      }

      // =========================
      // RESERVE STOCK IN ZOHO
      // Creates + confirms a sales order, which commits this order's items so
      // they can't be sold to anyone else while this customer is on the payment
      // page. Reversible via voidSalesOrder if payment doesn't go through.
      // =========================

      let salesOrder;

      try {
        salesOrder = await createSalesOrder(pendingOrder, supabase);
      } catch (zohoErr) {
        console.error(`Zoho reservation failed for order ${pendingOrder.id}:`, zohoErr);

        await supabase
          .from("Orders")
          .update({ status: "reservation_failed" })
          .eq("id", pendingOrder.id);

        return res.status(409).json({
          error: "One or more items in your cart just went out of stock. Please review your cart and try again.",
        });
      }

      await supabase
        .from("Orders")
        .update({ zohoOrderID: salesOrder.salesorder_id })
        .eq("id", pendingOrder.id);

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
          await voidSalesOrder(salesOrder.salesorder_id);
        } catch (voidErr) {
          console.error(`Failed to void orphaned Zoho reservation ${salesOrder.salesorder_id}:`, voidErr);
        }

        await supabase
          .from("Orders")
          .update({ status: "checkout_failed" })
          .eq("id", pendingOrder.id);

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