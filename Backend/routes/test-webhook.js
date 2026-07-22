// test-webhook.js — run locally with: node test-webhook.js
const crypto = require("crypto");
const fs = require("fs");

const secret = "YOUR_REVOLUT_WEBHOOK_SECRET";
const timestamp = Date.now().toString();
const payload = JSON.stringify({
  event: "ORDER_COMPLETED",
  order_id: "test-order-id",
  merchant_order_ext_ref: "6a5f8bb5-664e-ad10-9742-7a5778fde4e4"
});

const signature = crypto
  .createHmac("sha256", secret)
  .update(`v1.${timestamp}.${payload}`)
  .digest("hex");

fs.writeFileSync("payload.json", payload);

console.log(`curl -X POST "https://api.karskkaffe.dk/api/webhooks/revolut" -H "Content-Type: application/json" -H "Revolut-Signature: v1=${signature}" -H "Revolut-Request-Timestamp: ${timestamp}" --data-binary "@payload.json"`);