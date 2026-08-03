const express = require("express");
const crypto = require("crypto");

const { processOrder } = require("../utils/process-order");

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

      console.log("=== WEBHOOK EVENT ===", event);

      if (event.event !== "ORDER_COMPLETED") {
        return res.status(200).send("Ignored");
      }

      const revolutOrderId = event.order_id;

      const { data: order, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("revolutOrderId", revolutOrderId)
        .single();

      if (error || !order) {
        console.error("Webhook: order not found for revolutOrderId", revolutOrderId);
        return res.status(404).send("Order not found");
      }

      if (order.status === "paid") {
        return res.status(200).send("Already processed");
      }

      await supabase
        .from("Orders")
        .update({ status: "paid" })
        .eq("id", order.id);

      // Respond to Revolut immediately — don't make it wait on Shipmondo/Zoho/email calls.
      // If any of those fail, processOrder() already isolates them internally (Promise.allSettled)
      // and logs the failure; it does not throw. We still wrap in try/catch as a last-resort net.
      res.status(200).send("OK");

      // TODO next: redeem discount code (order.discountCode) once it's actually used.

      processOrder(order, supabase).catch((err) => {
        // processOrder() is designed not to throw (each step is isolated), so reaching this
        // means something outside that isolation broke — worth a loud log since the HTTP
        // response has already been sent and there's no other place this surfaces.
        console.error(`processOrder threw unexpectedly for order ${order.id}:`, err);
      });

    } catch (err) {
      console.error("Webhook processing error:", err);
      if (!res.headersSent) {
        res.status(500).send("Server error");
      }
    }
  });

  return router;
};