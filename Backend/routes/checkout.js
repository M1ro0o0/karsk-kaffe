const express = require("express");
const { calculateOrderTotal } = require("../utils/pricing");
const { createRevolutOrder } = require("../utils/revolut");

module.exports = (supabase) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const { cartItems, discountCode, shippingCost, customerEmail, customerName } = req.body;

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }
      if (!customerEmail || !customerName) {
        return res.status(400).json({ error: "Missing customer details" });
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
          totalAmount: total
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

      res.json({ checkoutUrl: revolutOrder.checkout_url });

    } catch (err) {
      console.error("Checkout error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};