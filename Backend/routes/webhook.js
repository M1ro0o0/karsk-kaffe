const express = require("express");
const crypto = require("crypto");

module.exports = (supabase) => {
  const router = express.Router();

  router.post("/revolut", async (req, res) => {
    try {
      const signatureHeader = req.headers["revolut-signature"];
      const timestamp = req.headers["revolut-request-timestamp"];
      const rawPayload = req.body.toString("utf8");

      if (!signatureHeader || !timestamp) {
        return res.status(401).send("Missing signature headers");
      }

      const timestampMs = Number(timestamp);
      const fiveMinutesMs = 5 * 60 * 1000;
      if (Math.abs(Date.now() - timestampMs) > fiveMinutesMs) {
        console.warn("Revolut webhook rejected: timestamp too old");
        return res.status(401).send("Timestamp out of tolerance");
      }

      const payloadToSign = `v1.${timestamp}.${rawPayload}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.REVOLUT_WEBHOOK_SECRET)
        .update(payloadToSign)
        .digest("hex");

      const providedSignatures = signatureHeader.split(",").map(s => s.trim());
      const isValid = providedSignatures.some(sig => sig === `v1=${expectedSignature}`);

      if (!isValid) {
        console.warn("Invalid Revolut webhook signature");
        return res.status(401).send("Invalid signature");
      }

      const event = JSON.parse(rawPayload);

      if (event.event !== "ORDER_COMPLETED") {
        return res.status(200).send("Ignored");
      }

      const orderId = event.merchant_order_ext_ref;

      const { data: order, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        console.error("Webhook: order not found for ID", orderId);
        return res.status(404).send("Order not found");
      }

      if (order.status === "paid") {
        return res.status(200).send("Already processed");
      }

      await supabase
        .from("Orders")
        .update({ status: "paid" })
        .eq("id", orderId);

      // TODO next: redeem discount code, push to Zoho, create Shipmondo shipment, send emails

      res.status(200).send("OK");

    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).send("Server error");
    }
  });

  return router;
};
