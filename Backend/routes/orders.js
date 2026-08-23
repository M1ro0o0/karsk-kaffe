const express = require("express");

const { releaseOrder } = require("../utils/order-reservation");

module.exports = (supabase) => {
  const router = express.Router();

router.get("/:id/status", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Orders")
      .select("id, status, customerName, totalAmount, trackingURL, cartItems, shippingCost, discount")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Called by the frontend when the Revolut popup closes without payment completing (see
 * CheckoutPage.jsx) — releases the Zoho stock reservation immediately instead of leaving it
 * held until the stale-order sweep eventually catches it. releaseOrder() atomically checks the
 * order is still "pending" before touching anything, so this is a safe no-op if the payment
 * actually succeeded moments before the popup-closed check fired.
 */
router.post("/:id/cancel", async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from("Orders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const { released } = await releaseOrder(order, supabase, "abandoned");

    if (released) {
      return res.json({ status: "abandoned" });
    }

    // Not released means something else (almost certainly the payment webhook) already
    // moved the order off "pending" between our fetch and the atomic release attempt —
    // re-fetch so we report what actually happened rather than the stale status we read
    // a moment ago.
    const { data: current } = await supabase
      .from("Orders")
      .select("status")
      .eq("id", order.id)
      .single();

    res.json({ status: current?.status ?? order.status });
  } catch (err) {
    console.error(`Failed to cancel order ${req.params.id}:`, err);
    res.status(500).json({ error: "Server error" });
  }
});

  return router;
};