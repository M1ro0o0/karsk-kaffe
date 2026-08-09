const express = require("express");

const { calculateOrderTotal } = require("../utils/pricing");
const { createRevolutOrder } = require("../utils/revolut");
const { generateOrderNumber } = require("../utils/invoice-number-generation");

const { computeSku } = require("../utils/sku");
const { getZohoIdForSku } = require("../utils/zoho-sku-lookup");
const { getItem } = require("../utils/zoho");

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
        return res.status(400).json({
          error: "Cart is empty",
        });
      }

      if (!customerEmail || !customerName) {
        return res.status(400).json({
          error: "Missing customer details",
        });
      }

      if (!billingAddress || !shippingAddress) {
        return res.status(400).json({
          error: "Missing address details",
        });
      }

      if (!shippingMethod) {
        return res.status(400).json({
          error: "Missing shipping method",
        });
      }

      // =========================
      // LOAD PRODUCT OPTIONS
      // =========================

      const {
        data: optionsFromDb,
        error: optionsError,
      } = await supabase
        .from("ProductOptions")
        .select("*");

      if (optionsError) {
        throw new Error(
          `Failed to load product options: ${optionsError.message}`
        );
      }

      // =========================
      // CHECK STOCK
      // =========================

      for (const item of cartItems) {
        let sku;

        try {
          sku = computeSku(
            item.id,
            item.options || {},
            optionsFromDb
          );
        } catch (skuError) {
          throw new Error(
            `Could not determine SKU for ${item.name}: ${skuError.message}`
          );
        }

        const zohoId = await getZohoIdForSku(
          supabase,
          sku
        );

        if (!zohoId) {
          throw new Error(
            `Product ${item.name} is currently unavailable.`
          );
        }

        const stockItem = await getItem(zohoId);

        const availableStock =
          Number(
            stockItem?.available_stock ??
            stockItem?.stock_on_hand ??
            0
          );

        const requestedQuantity = Number(item.quantity);

        if (
          !Number.isFinite(requestedQuantity) ||
          requestedQuantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for ${item.name}.`
          );
        }

        if (availableStock < requestedQuantity) {
          if (availableStock === 0) {
            throw new Error(
              `${item.name} is no longer available.`
            );
          }

          throw new Error(
            `Only ${availableStock} of ${item.name} are available, but ${requestedQuantity} were requested.`
          );
        }
      }

      // =========================
      // CALCULATE ORDER TOTAL
      // =========================

      const {
        totalInMinorUnits,
        total,
        discountAmount,
      } = await calculateOrderTotal(
        cartItems,
        discountCode,
        shippingCost || 0
      );

      // =========================
      // CREATE PENDING ORDER
      // =========================

      const {
        data: pendingOrder,
        error: insertError,
      } = await supabase
        .from("Orders")
        .insert({
          customerEmail,
          customerName,
          status: "pending",
          cartItems,
          discount: discountCode
            ? {
                code: discountCode,
                amount: Number(
                  discountAmount.toFixed(2)
                ),
              }
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
        throw new Error(
          `Failed to create pending order: ${insertError.message}`
        );
      }

      // =========================
      // CREATE REVOLUT ORDER
      // =========================

      const revolutOrder = await createRevolutOrder({
        amount: totalInMinorUnits,
        currency: "DKK",
        customerEmail,
        customerName,
        merchantOrderExtRef: pendingOrder.id,
      });

      // =========================
      // SAVE REVOLUT ORDER ID
      // =========================

      await supabase
        .from("Orders")
        .update({
          revolutOrderId: revolutOrder.id,
        })
        .eq("id", pendingOrder.id);

      // =========================
      // RESPONSE
      // =========================

      res.json({
        checkoutUrl: revolutOrder.checkout_url,
        orderId: pendingOrder.id,
      });

    } catch (err) {
      console.error(
        "Checkout error:",
        err.message
      );

      res.status(400).json({
        error: err.message,
      });
    }
  });

  return router;
};