const express = require("express");
const { calculateOrderTotal } = require("../utils/pricing");
const { createRevolutOrder } = require("../utils/revolut");

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

      const { totalInMinorUnits, total } = await calculateOrderTotal(
        cartItems,
        discountCode,
        shippingCost || 0
      );

      const { data: pendingOrder, error: insertError } = await supabase
        .from("Orders")
        .insert({
          customerEmail,
          customerName,
          status: "pending",
          cartItems,
          discountCode: discountCode || null,
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

      if (insertError) throw new Error(`Failed to create pending order: ${insertError.message}`);

      const revolutOrder = await createRevolutOrder({
        amount: totalInMinorUnits,
        currency: "DKK",
        customerEmail,
        customerName,
        merchantOrderExtRef: pendingOrder.id
      });

      await supabase
        .from("Orders")
        .update({ revolutOrderId: revolutOrder.id })
        .eq("id", pendingOrder.id);

      res.json({ checkoutUrl: revolutOrder.checkout_url, orderId: pendingOrder.id });
      
    } catch (err) {
      console.error("Checkout error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};