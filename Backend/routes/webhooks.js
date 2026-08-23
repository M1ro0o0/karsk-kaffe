const express = require("express");
const crypto = require("crypto");

const { processOrder } = require("../utils/order-process");
const { releaseOrder } = require("../utils/order-reservation");

module.exports = (supabase) => {
  const router = express.Router();

  router.post("/revolut", async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        // If this fires, this route is mounted behind express.json() (or similar) instead
        // of express.raw() — req.body is already a parsed object, and re-stringifying it
        // won't reproduce the exact bytes Revolut signed, so every signature check below
        // would silently fail. Fail loudly here instead of debugging "invalid signature"
        // for real webhooks later.
        console.error(
          "Revolut webhook route received a non-Buffer body — mount this route with express.raw({ type: '*/*' }) BEFORE any express.json() middleware."
        );
        return res.status(500).send("Server misconfiguration");
      }

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

      const revolutOrderId = event.order_id;

      // ORDER_CANCELLED / ORDER_FAILED are Revolut's *final* unsuccessful states (per their
      // docs) — release the reservation right away instead of waiting on the frontend's
      // popup-closed poll or the stale-order sweep. ORDER_PAYMENT_DECLINED / ORDER_PAYMENT_FAILED
      // are individual attempt failures, not final states — the customer can still retry on the
      // same order/popup, so we deliberately do NOT release the reservation for those.
      if (event.event === "ORDER_CANCELLED" || event.event === "ORDER_FAILED") {
        const { data: failedOrder, error: failedLookupError } = await supabase
          .from("Orders")
          .select("*")
          .eq("revolutOrderId", revolutOrderId)
          .single();

        if (failedLookupError || !failedOrder) {
          console.error(`Webhook (${event.event}): order not found for revolutOrderId`, revolutOrderId);
          return res.status(200).send("Ignored");
        }

        releaseOrder(failedOrder, supabase, "payment_failed").catch((err) => {
          console.error(`Failed to release order ${failedOrder.id} after ${event.event}:`, err);
        });

        return res.status(200).send("Ignored");
      }

      if (event.event !== "ORDER_COMPLETED") {
        return res.status(200).send("Ignored");
      }

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

      // Respond to Revolut immediately — don't make it wait on Shipmondo/Zoho/email calls.
      // If any of those fail, processOrder() already isolates them internally (Promise.allSettled)
      // and logs the failure; it does not throw. We still wrap in try/catch as a last-resort net.
      res.status(200).send("OK");

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