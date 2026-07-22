// test-webhook.js — run locally with: node test-webhook.js
const crypto = require("crypto");
const fs = require("fs");

const secret = "wsk_gwJPrkL8QRR7PDb6q1fK7IMDQNGoUzch";
const timestamp = Date.now().toString();
const payload = JSON.stringify({
  event: "ORDER_COMPLETED",
  order_id: "test-order-id",
  merchant_order_ext_ref: "b3a11c78-70f2-4d55-bef0-1fd8615be5a9"
});

const signature = crypto
  .createHmac("sha256", secret)
  .update(`v1.${timestamp}.${payload}`)
  .digest("hex");

fs.writeFileSync("payload.json", payload);

console.log(`curl -X POST "https://api.karskkaffe.dk/api/webhooks/revolut" -H "Content-Type: application/json" -H "Revolut-Signature: v1=${signature}" -H "Revolut-Request-Timestamp: ${timestamp}" --data-binary "@payload.json"`);